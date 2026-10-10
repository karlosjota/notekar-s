const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const publicVendor = path.join(root, 'public', 'vendor');

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

const bootstrap = path.join(root, 'node_modules', 'bootstrap', 'dist');
copyFile(
  path.join(bootstrap, 'css', 'bootstrap.min.css'),
  path.join(publicVendor, 'bootstrap', 'bootstrap.min.css')
);
copyFile(
  path.join(bootstrap, 'js', 'bootstrap.bundle.min.js'),
  path.join(publicVendor, 'bootstrap', 'bootstrap.bundle.min.js')
);

const fontAwesome = path.join(root, 'node_modules', '@fortawesome', 'fontawesome-free');
copyFile(
  path.join(fontAwesome, 'css', 'all.min.css'),
  path.join(publicVendor, 'fontawesome', 'css', 'all.min.css')
);
fs.cpSync(
  path.join(fontAwesome, 'webfonts'),
  path.join(publicVendor, 'fontawesome', 'webfonts'),
  { recursive: true }
);

console.log('Bootstrap y Font Awesome copiados a public/vendor.');
