const fs = require('node:fs');
const [marker, mode = 'failure'] = process.argv.slice(2);
if (marker) {
  console.log('Unit process started');
  console.error('Unit process diagnostic on stderr');
  setTimeout(() => {
    fs.writeFileSync(marker, 'unit child cleanup completed');
    console.log('Unit child cleanup completed');
    process.exitCode = mode === 'success' ? 0 : 7;
  }, 200);
}
