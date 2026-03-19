process.stdout.isTTY = undefined;
process.stderr.isTTY = undefined;
Object.defineProperty(process, 'stdout', { value: undefined });

import('./build/server/nodejs-eyJydW50aW1lIjoibm9kZWpzIn0/assets/server-build-B_FbLfny.js').then(async (m) => {
  const checkEnvKey = m.r['routes/api.check-env-key'].module;
  
  try {
    const req = new Request('http://localhost:5173/api/check-env-key?provider=Google');
    const response = await checkEnvKey.loader({ request: req, params: {}, context: {} });
    console.log("CheckEnvKey:", response.status);
    console.log(await response.text());
  } catch (err) {
    console.error("CheckEnvKey CRASH:", err);
  }
}).catch(console.error);
