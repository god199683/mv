const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const publicDir = __dirname;
const rooms = {
  mv: path.join(root, '01_MV_캐릭터시트_작업실', 'output'),
  fox: path.join(root, '02_세구미호_랜덤영상_작업실', 'output'),
};
const jobs = new Map();
const port = Number(process.env.PORT || 3030);

function json(res, status, value) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); }
function type(file) { return file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream'; }
function apiKey() { return process.env.XAI_API_KEY; }
function xaiHeaders() { return {'Content-Type':'application/json', Authorization:`Bearer ${apiKey()}`}; }

async function submit(body) {
  const request = await fetch('https://api.x.ai/v1/videos/generations', {method:'POST', headers:xaiHeaders(), body:JSON.stringify(body)});
  const data = await request.json().catch(() => ({}));
  if (!request.ok) throw new Error(data.error?.message || data.message || `xAI 요청 실패 (${request.status})`);
  return data.request_id;
}
async function poll(id, job) {
  try {
    const response = await fetch(`https://api.x.ai/v1/videos/${id}`, {headers:{Authorization:`Bearer ${apiKey()}`}});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `상태 확인 실패 (${response.status})`);
    job.status = data.status || 'pending';
    if (data.status === 'failed') throw new Error(data.error?.message || 'Grok이 영상 생성을 완료하지 못했습니다.');
    if (data.status !== 'done') return;
    const source = data.video?.url;
    if (!source) throw new Error('완료 응답에 영상 URL이 없습니다.');
    const download = await fetch(source);
    if (!download.ok) throw new Error('생성 영상을 보관함으로 저장하지 못했습니다.');
    const filename = `${new Date().toISOString().replace(/[:.]/g,'-')}-${job.id}.mp4`;
    fs.mkdirSync(rooms[job.room], {recursive:true});
    fs.writeFileSync(path.join(rooms[job.room], filename), Buffer.from(await download.arrayBuffer()));
    job.status = 'done'; job.file = filename; job.duration = data.video?.duration;
  } catch (error) { job.status = 'failed'; job.error = error.message; }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return fs.createReadStream(path.join(publicDir, 'index.html')).pipe(res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}));
  }
  if (req.method === 'GET' && url.pathname.startsWith('/videos/')) {
    const [, , room, file] = url.pathname.split('/');
    if (!rooms[room] || !/^[\w.-]+\.mp4$/.test(file)) return json(res, 404, {error:'파일을 찾을 수 없습니다.'});
    const videoPath = path.join(rooms[room], file);
    if (!fs.existsSync(videoPath)) return json(res, 404, {error:'파일을 찾을 수 없습니다.'});
    return fs.createReadStream(videoPath).pipe(res.writeHead(200, {'Content-Type':'video/mp4'}));
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
    const job = jobs.get(url.pathname.split('/').pop());
    return job ? json(res, 200, job) : json(res, 404, {error:'작업을 찾을 수 없습니다.'});
  }
  if (req.method === 'POST' && url.pathname === '/api/generate') {
    if (!apiKey()) return json(res, 500, {error:'XAI_API_KEY가 설정되지 않았습니다. README의 실행 방법을 확인하세요.'});
    let raw=''; for await (const chunk of req) { raw += chunk; if (raw.length > 25_000_000) return json(res,413,{error:'첨부 이미지가 너무 큽니다.'}); }
    try {
      const {room, prompt, image, referenceImages, duration=8, aspectRatio='16:9', resolution='720p', audio=true} = JSON.parse(raw);
      if (!rooms[room] || !prompt?.trim()) return json(res,400,{error:'작업실과 프롬프트를 입력하세요.'});
      const seconds = Math.min(15, Math.max(1, Number(duration)));
      const body = {model:'grok-imagine-video-1.5', prompt:prompt.trim(), duration:seconds, aspect_ratio:aspectRatio, resolution, generate_audio:Boolean(audio)};
      if (image) body.image = {url:image};
      if (Array.isArray(referenceImages) && referenceImages.length) body.reference_images = referenceImages.slice(0,14).map(url => ({url}));
      const requestId = await submit(body);
      const id = crypto.randomUUID(); const job = {id, room, requestId, status:'pending', createdAt:new Date().toISOString()}; jobs.set(id, job);
      const timer = setInterval(async () => { await poll(requestId, job); if (job.status === 'done' || job.status === 'failed') clearInterval(timer); }, 5000);
      return json(res, 202, job);
    } catch (error) { return json(res, 400, {error:error.message || '요청을 처리하지 못했습니다.'}); }
  }
  json(res, 404, {error:'찾을 수 없습니다.'});
}).listen(port, '127.0.0.1', () => console.log(`작업실: http://127.0.0.1:${port}`));
