import readline from 'node:readline';
import { REPO, STATE } from './paths.js';
import { EnvironmentStore } from './store.js';
import { initializeState } from './auth.js';
import { createConsole } from './server.js';
import { ToolError, demand } from './errors.js';
function hiddenPassword(prompt) {
  demand(process.stdin.isTTY && process.stdout.isTTY, 'INTERACTIVE', 'Bootstrap ต้องใช้ Terminal แบบ Interactive; ไม่รับ Password ผ่าน pipe หรือ argument');
  process.stdout.write(prompt);
  readline.emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = error => { process.stdin.off('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); if (error) reject(error); else resolve(value); };
    const onKey = (character, key) => {
      if (key?.ctrl && key.name === 'c') return finish(new ToolError('CANCELLED', 'ยกเลิก Bootstrap'));
      if (key?.name === 'return') return finish();
      if (key?.name === 'backspace') { value = [...value].slice(0, -1).join(''); return; }
      if (typeof character === 'string' && !/[\x00-\x1f\x7f]/.test(character) && value.length < 256) value += character;
    };
    process.stdin.on('keypress', onKey);
  });
}
try {
  demand(process.argv.length === 3 && ['bootstrap','serve'].includes(process.argv[2]), 'USAGE', 'ใช้ node src/cli.js bootstrap หรือ node src/cli.js serve เท่านั้น');
  const check = new EnvironmentStore({ repo: REPO, directory: STATE, backupKey: '0'.repeat(64) });
  await check.development();
  if (process.argv[2] === 'bootstrap') {
    let password = await hiddenPassword('ตั้งรหัสผ่าน Developer root (14–256 ตัวอักษร ไม่แสดงขณะพิมพ์): ');
    let confirmation = await hiddenPassword('ยืนยันรหัสผ่าน: ');
    demand(password === confirmation, 'PASSWORD_MATCH', 'รหัสผ่านไม่ตรงกัน');
    await initializeState(STATE, REPO, password); password = ''; confirmation = '';
    console.log('สร้าง Developer root สำเร็จ เก็บ Credential/Backup นอก Repository ภายใต้บัญชี OS ปัจจุบัน');
  } else {
    const app = await createConsole(); const url = await app.listen();
    console.log(`FITM-INTERN Developer Console: ${url} (Loopback only; Ctrl+C เพื่อหยุด)`);
    let stopping = false;
    const stop = async () => { if (stopping) return; stopping = true; await app.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  }
} catch (error) {
  console.error(error instanceof ToolError ? `${error.code}: ${error.message}` : 'BLOCKED: ตรวจ Credential Store, ไฟล์และสิทธิ์ Local; ใช้ Bootstrap แบบ Interactive ก่อน Start');
  process.exitCode = 1;
}
