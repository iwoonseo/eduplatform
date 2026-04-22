// Wrapper: change CWD to frontend/ before react-scripts resolves paths
const path = require('path');
process.chdir(path.join(__dirname, 'frontend'));
process.env.BROWSER = 'none'; // don't auto-open browser
require(path.join(__dirname, 'frontend/node_modules/react-scripts/scripts/start.js'));
