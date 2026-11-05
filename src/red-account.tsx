import './red-account.css';
const portal='https://accounts.cdprojektred.com/';
export function RedAccount(){
 return <section className="red-account" aria-label="Cuenta de CD PROJEKT RED">
  <div><strong>CD PROJEKT RED</strong><span>Sin vincular</span></div>
  <p>Accede o regístrate en el portal oficial. La cuenta todavía no se vincula al launcher ni importa juegos.</p>
  <div className="red-account-actions"><a className="primary-button" href={portal} target="_blank" rel="noopener noreferrer">Iniciar sesión en CD PROJEKT RED ↗</a><a className="quiet-button" href={portal} target="_blank" rel="noopener noreferrer">Crear cuenta en CD PROJEKT RED ↗</a></div>
  <small>Ambas opciones abren el portal oficial, donde puedes elegir iniciar sesión o registrarte.</small>
 </section>;
}
