/**
 * Armazon del panel: la barra lateral oscura del prototipo, la miga de pan
 * con el codigo de pantalla, y el contenido.
 *
 * El contador de excepciones vive en el menu porque el sistema NO empuja
 * avisos —esa fue la decision del negocio— y alguien que esta trabajando en
 * otra pantalla no tiene otra forma de enterarse de que llego trabajo de
 * campo sin conciliar. Se refresca cada tres minutos: un aviso que llega
 * cuatro minutos tarde no cambia nada, y una conexion abierta todo el dia
 * por cada puesto del centro, si.
 *
 * En una pantalla estrecha (celular o tableta) el menu lateral se vuelve un
 * cajon que se abre con el boton de la barra superior, y las tablas se leen
 * como tarjetas: cada celda recibe en `data-etiqueta` el encabezado de su
 * columna, y la hoja de estilos lo pinta al lado del dato. En computadora
 * nada de esto se ve; los estilos estan en estilos.css.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { BandejaDeAvisos } from '@servitotal/compartido';
import { useSesion } from '../sesion/contexto.js';
import { menuDe, rolLegible } from '../sesion/navegacion.js';

const REFRESCO_MS = 3 * 60_000;

/**
 * Copia el encabezado de cada columna a sus celdas (`data-etiqueta`), para
 * que en celular la fila se lea como tarjeta: «CLIENTE  Yelba Morales».
 * Solo toca tablas `.d` con encabezado; las demas se quedan como estan.
 */
function etiquetarTablas(contenedor: HTMLElement): void {
  contenedor.querySelectorAll<HTMLTableElement>('table.d').forEach((tabla) => {
    const encabezados = Array.from(tabla.querySelectorAll('thead th'))
      .map((celda) => (celda.textContent ?? '').trim());
    if (encabezados.length === 0) return;
    tabla.classList.add('tabla-tarjetas');
    tabla.querySelectorAll('tbody tr, tfoot tr').forEach((fila) => {
      let columna = 0;
      Array.from(fila.children).forEach((celda) => {
        const etiqueta = encabezados[columna] ?? '';
        if (celda.getAttribute('data-etiqueta') !== etiqueta) {
          celda.setAttribute('data-etiqueta', etiqueta);
        }
        columna += Number((celda as HTMLTableCellElement).colSpan) || 1;
      });
    });
  });
}

function IconoMenu(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconoCerrar(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const TITULO_DE_GRUPO: Record<string, string> = {
  ordenes: 'ORDENES DE REPARACION',
  inventario: 'INVENTARIO DE REPUESTOS',
  control: 'CONTROL Y ADMINISTRACION',
};

export interface DatosDePantalla {
  /** Codigo del prototipo: W-02, W-03… Se muestra en la miga de pan. */
  readonly codigo: string;
  readonly miga: string;
}

export function Armazon(
  { pantalla, children }: { pantalla: DatosDePantalla; children: ReactNode },
): JSX.Element {
  const { usuario, salir, api } = useSesion();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let vigente = true;
    const consultar = (): void => {
      api.pedir<BandejaDeAvisos>('/avisos')
        .then((bandeja) => {
          if (!vigente) return;
          const excepciones = bandeja.grupos.find(
            (grupo) => grupo.tipo === 'excepcion_sincronizacion',
          );
          setPendientes(excepciones?.total ?? 0);
        })
        // Un fallo al contar no puede romper el panel entero.
        .catch(() => undefined);
    };
    consultar();
    const temporizador = setInterval(consultar, REFRESCO_MS);
    return () => { vigente = false; clearInterval(temporizador); };
  }, [api]);

  const secciones = menuDe(usuario);
  const ubicacion = useLocation();
  let grupoDibujado = '';

  // ── el cajon del menu, solo en pantallas estrechas ──
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Al cambiar de pantalla el cajon se cierra: ya cumplio su funcion.
  useEffect(() => { setMenuAbierto(false); }, [ubicacion.pathname, ubicacion.search]);
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPulsar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    // Con el cajon abierto, la pagina de atras no se desplaza.
    const desbordeAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alPulsar);
    return () => {
      document.body.style.overflow = desbordeAnterior;
      document.removeEventListener('keydown', alPulsar);
    };
  }, [menuAbierto]);

  // ── tablas legibles como tarjetas en celular ──
  const cuerpo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const contenedor = cuerpo.current;
    if (contenedor === null) return undefined;
    etiquetarTablas(contenedor);
    if (typeof MutationObserver === 'undefined') return undefined;
    // Las pantallas cargan sus datos despues de montarse: se vuelve a
    // etiquetar cuando aparecen filas nuevas. Solo se observan nodos, no
    // atributos, asi que etiquetar no se dispara a si mismo.
    let pendiente = 0;
    const observador = new MutationObserver(() => {
      if (pendiente !== 0) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        etiquetarTablas(contenedor);
      });
    });
    observador.observe(contenedor, { childList: true, subtree: true });
    return () => {
      observador.disconnect();
      if (pendiente !== 0) cancelAnimationFrame(pendiente);
    };
  }, []);

  return (
    <div className="app">
      <header className="barra-movil">
        <button
          type="button"
          className="hamburguesa"
          aria-label="Abrir el menu"
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          onClick={() => setMenuAbierto(true)}
        >
          <IconoMenu />
          {pendientes > 0 ? <span className="punto" title={`${pendientes} excepciones`} /> : null}
        </button>
        <span className="brand">Servi<span>Total</span></span>
        <span className="barra-movil-pantalla">
          {pantalla.miga}
          <span className="code">{pantalla.codigo}</span>
        </span>
      </header>

      {menuAbierto
        ? <div className="velo-menu" aria-hidden="true" onClick={() => setMenuAbierto(false)} />
        : null}

      <nav id="menu-principal" className={menuAbierto ? 'side abierta' : 'side'}>
        <div className="who">
          <div>
            <b>{usuario?.nombres ?? ''}</b>
            <span>{rolLegible(usuario)}</span>
          </div>
          <button
            type="button"
            className="cerrar-menu"
            aria-label="Cerrar el menu"
            onClick={() => setMenuAbierto(false)}
          >
            <IconoCerrar />
          </button>
        </div>

        {secciones.map((seccion) => {
          const encabezado = seccion.grupo !== grupoDibujado && seccion.grupo !== 'inicio'
            ? TITULO_DE_GRUPO[seccion.grupo]
            : null;
          grupoDibujado = seccion.grupo;
          return (
            <div key={seccion.ruta}>
              {encabezado === undefined || encabezado === null
                ? null
                : <div className="sep">{encabezado}</div>}
              <NavLink
                to={seccion.ruta}
                // Exacto cuando otra seccion cuelga de esta ruta: «Ordenes»
                // no se marca estando en «Nueva orden».
                end={seccion.ruta === '/'
                  || secciones.some((otra) => otra !== seccion && otra.ruta.startsWith(`${seccion.ruta}/`))}
                // Una seccion con consulta («entregas pendientes») solo se
                // marca con esa misma consulta: NavLink compara la ruta sin
                // ella y la marcaria en cualquier pantalla de ordenes.
                className={({ isActive }) => {
                  const conConsulta = seccion.ruta.includes('?');
                  const activa = conConsulta
                    ? `${ubicacion.pathname}${ubicacion.search}` === seccion.ruta
                    : isActive && !secciones.some((otra) => otra.ruta.includes('?')
                      && `${ubicacion.pathname}${ubicacion.search}` === otra.ruta);
                  return activa ? 'on' : '';
                }}
              >
                {seccion.etiqueta}
                {seccion.ruta === '/excepciones' && pendientes > 0
                  ? <span className="bdg">{pendientes}</span>
                  : null}
              </NavLink>
            </div>
          );
        })}

        <div className="sep">SESION</div>
        <a onClick={salir} style={{ cursor: 'pointer' }}>Cerrar sesion</a>
      </nav>

      <div className="main">
        <div className="crumb">
          <span className="code">{pantalla.codigo}</span>
          <span>{pantalla.miga}</span>
        </div>
        <div className="body" ref={cuerpo}>{children}</div>
      </div>
    </div>
  );
}
