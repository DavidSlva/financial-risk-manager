import { createApp } from './app.js';
import { environment } from './config/environment.js';
import { DataIntegrityError, getDataStore } from './services/data-store.service.js';

// Falla rápido: si los datos no son íntegros (spec 006), el proceso no arranca.
try {
  getDataStore().load();
} catch (error) {
  if (error instanceof DataIntegrityError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

createApp().listen(environment.port, () => {
  console.log(`API escuchando en el puerto ${environment.port} (${environment.nodeEnv})`);
});
