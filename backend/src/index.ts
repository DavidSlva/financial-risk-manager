import { createApp } from './app.js';
import { environment } from './config/environment.js';

createApp().listen(environment.port, () => {
  console.log(`API escuchando en el puerto ${environment.port} (${environment.nodeEnv})`);
});
