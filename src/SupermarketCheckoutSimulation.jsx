import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Users, ShoppingCart, Clock, TrendingDown, AlertCircle, Award, Star, BarChart3, Zap, TrendingUp, Target, Database } from 'lucide-react';

const SupermarketCheckoutSimulation = () => {
  const [cajas, setCajas] = useState([]);
  const [cajaExpress, setCajaExpress] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState(null);
  const [simulacionActiva, setSimulacionActiva] = useState(false);
  const [velocidadSimulacion, setVelocidadSimulacion] = useState(50);
  const [configuracion, setConfiguracion] = useState({
    numCajasNormales: 3,
    personasPorCajaNormal: [3, 4, 2],
    personasCajaExpress: 5,
    tiempoEscaneoNovato: 8,
    tiempoEscaneoNormal: 5,
    tiempoEscaneoExperto: 3,
    tiempoCobro: 20,
    articulosAleatorios: { min: 1, max: 50 },
    incluirCajaExpress: true,
    articulosNuevoCliente: 15,
    cajasSeleccionadas: [],
    asignacionCajerosAleatoria: true,
    cajerosAsignados: ['normal', 'normal', 'normal'],
    cajeroExpress: 'experto'
  });
  const [mostrarConfig, setMostrarConfig] = useState(true);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [analisisCompleto, setAnalisisCompleto] = useState(null);
  const [todosLosClientesSalieron, setTodosLosClientesSalieron] = useState(false);
  const [errorExpress, setErrorExpress] = useState('');
  const [historialSimulaciones, setHistorialSimulaciones] = useState([]);
  const [mostrarTabla, setMostrarTabla] = useState(false);
  const [mostrarModalTerminado, setMostrarModalTerminado] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState('configurar');
  
  // NUEVO: Estado para estadísticas acumulativas
  const [estadisticasAcumuladas, setEstadisticasAcumuladas] = useState({});
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
  
  const intervaloRef = useRef(null);

  const casosPredefinidos = {
    todasLasCajas: {
      nombre: "Todas las cajas",
      descripcion: "Compara tu tiempo en todas las cajas disponibles",
      config: (config) => ({
        ...config,
        cajasSeleccionadas: Array.from({ length: config.numCajasNormales + (config.incluirCajaExpress ? 1 : 0) }, (_, i) => i)
      })
    },
    soloExpress: {
      nombre: "Solo Caja Express",
      descripcion: "Prueba únicamente la caja express (máx 10 artículos)",
      config: (config) => ({
        ...config,
        articulosNuevoCliente: Math.min(config.articulosNuevoCliente, 10),
        articulosAleatorios: { min: 3, max: 10 },
        cajasSeleccionadas: config.incluirCajaExpress ? [config.numCajasNormales] : []
      })
    },
    normalVsExpress: {
      nombre: "Mejor Normal vs Express",
      descripcion: "Compara la mejor caja normal contra express",
      config: (config) => {
        const personasPorCaja = config.personasPorCajaNormal || [];
        const cajaMenosPersonas = personasPorCaja.indexOf(Math.min(...personasPorCaja));
        return {
          ...config,
          articulosNuevoCliente: Math.min(config.articulosNuevoCliente, 10),
          articulosAleatorios: { min: 3, max: 10 },
          cajasSeleccionadas: config.incluirCajaExpress ? [cajaMenosPersonas, config.numCajasNormales] : [cajaMenosPersonas]
        };
      }
    },
    pocosArticulos: {
      nombre: "Pocos artículos (1-5)",
      descripcion: "Simula compra rápida con pocos artículos",
      config: (config) => ({
        ...config,
        articulosNuevoCliente: Math.floor(Math.random() * 5) + 1,
        articulosAleatorios: { min: 1, max: 5 },
        personasPorCajaNormal: Array.from({ length: config.numCajasNormales }, () => Math.floor(Math.random() * 4) + 2),
        personasCajaExpress: Math.floor(Math.random() * 4) + 3,
        cajasSeleccionadas: Array.from({ length: config.numCajasNormales + (config.incluirCajaExpress ? 1 : 0) }, (_, i) => i)
      })
    },
    muchosArticulos: {
      nombre: "Muchos artículos (30-50)",
      descripcion: "Simula compra grande del mes",
      config: (config) => ({
        ...config,
        articulosNuevoCliente: Math.floor(Math.random() * 21) + 30,
        articulosAleatorios: { min: 30, max: 50 },
        personasPorCajaNormal: Array.from({ length: config.numCajasNormales }, () => Math.floor(Math.random() * 4) + 2),
        cajasSeleccionadas: Array.from({ length: config.numCajasNormales }, (_, i) => i)
      })
    },
    horaPico: {
      nombre: "Hora pico",
      descripcion: "Todas las cajas con muchas personas (20-50 por caja)",
      config: (config) => ({
        ...config,
        personasPorCajaNormal: Array.from({ length: config.numCajasNormales }, () => Math.floor(Math.random() * 31) + 20),
        personasCajaExpress: Math.floor(Math.random() * 31) + 20,
        articulosAleatorios: { min: 5, max: 30 },
        cajasSeleccionadas: Array.from({ length: config.numCajasNormales + (config.incluirCajaExpress ? 1 : 0) }, (_, i) => i)
      })
    }
  };

  const generarCliente = (id, maxArticulos = 50, minArticulos = 5) => {
    const articulos = Math.floor(Math.random() * (maxArticulos - minArticulos + 1)) + minArticulos;
    return {
      id,
      articulos,
      articulosRestantes: articulos,
      tiempoCobro: configuracion.tiempoCobro,
      tiempoRestante: 0,
      enAtencion: false,
      esNuevoCliente: false,
      tiempoSalida: null
    };
  };

  const calcularTiempoTotal = (caja) => {
    return caja.clientes.reduce((total, cliente) => {
      return total + (cliente.articulos * caja.tiempoEscaneo) + cliente.tiempoCobro;
    }, 0);
  };

  const formatearTiempo = (segundos) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    if (minutos === 0) return `${segs}s`;
    return `${minutos}m ${segs}s`;
  };

  const getNivelExperiencia = (tiempoEscaneo) => {
    if (tiempoEscaneo >= 7) return { nivel: 'Novato', icon: '🆕', color: 'text-orange-600' };
    if (tiempoEscaneo >= 5) return { nivel: 'Normal', icon: '⭐', color: 'text-blue-600' };
    return { nivel: 'Experto', icon: '🏆', color: 'text-green-600' };
  };

  const aplicarCaso = (nombreCaso) => {
    const caso = casosPredefinidos[nombreCaso];
    if (caso) {
      setConfiguracion(prev => caso.config(prev));
      setErrorExpress('');
      setCasoSeleccionado(nombreCaso);
    }
  };

  const inicializarSimulacion = () => {
    if (configuracion.articulosNuevoCliente > 10 && configuracion.incluirCajaExpress && configuracion.cajasSeleccionadas.includes(configuracion.numCajasNormales)) {
      setErrorExpress('❌ No puedes ir a la Caja Express con más de 10 artículos');
      return;
    }

    if (configuracion.cajasSeleccionadas.length === 0) {
      setErrorExpress('❌ Debes seleccionar al menos una caja');
      return;
    }

    setErrorExpress('');
    const nuevasCajas = [];
    let clienteId = 1;

    const tiposEscaneo = [
      configuracion.tiempoEscaneoNovato,
      configuracion.tiempoEscaneoNormal,
      configuracion.tiempoEscaneoExperto
    ];

    const tiposAsignados = [];
    const cajerosInfo = []; // NUEVO: Guardamos info de cajeros para estadísticas

    for (let i = 0; i < configuracion.numCajasNormales + (configuracion.incluirCajaExpress ? 1 : 0); i++) {
      const tiempoSeleccionado = tiposEscaneo[Math.floor(Math.random() * tiposEscaneo.length)];
      tiposAsignados.push(tiempoSeleccionado);
      cajerosInfo.push(getNivelExperiencia(tiempoSeleccionado).nivel);
    }

    const minArticulos = configuracion.articulosAleatorios.min;
    const maxArticulos = configuracion.articulosAleatorios.max;

    for (let i = 0; i < configuracion.numCajasNormales; i++) {
      const clientes = [];
      const numPersonas = configuracion.personasPorCajaNormal[i] || 0;

      for (let j = 0; j < numPersonas; j++) {
        clientes.push(generarCliente(clienteId++, maxArticulos, minArticulos));
      }

      nuevasCajas.push({
        id: i + 1,
        tipo: 'normal',
        tiempoEscaneo: tiposAsignados[i],
        clientes,
        tiempoTotal: 0,
        clientesAtendidos: 0,
        nivelCajero: cajerosInfo[i] // NUEVO
      });
    }

    let nuevaCajaExpress = null;
    if (configuracion.incluirCajaExpress) {
      const clientesExpress = [];
      const numClientesExpress = configuracion.personasCajaExpress;
      const maxArticulosExpress = Math.min(10, maxArticulos);
      const minArticulosExpress = Math.min(minArticulos, maxArticulosExpress);

      for (let j = 0; j < numClientesExpress; j++) {
        clientesExpress.push(generarCliente(clienteId++, maxArticulosExpress, minArticulosExpress));
      }

      nuevaCajaExpress = {
        id: 'express',
        tipo: 'express',
        tiempoEscaneo: tiposAsignados[configuracion.numCajasNormales],
        clientes: clientesExpress,
        tiempoTotal: 0,
        clientesAtendidos: 0,
        limiteArticulos: 10,
        nivelCajero: cajerosInfo[configuracion.numCajasNormales] // NUEVO
      };
    }

    const clienteNuevo = {
      id: 'NUEVO',
      articulos: configuracion.articulosNuevoCliente,
      articulosRestantes: configuracion.articulosNuevoCliente,
      tiempoCobro: configuracion.tiempoCobro,
      tiempoRestante: 0,
      enAtencion: false,
      esNuevoCliente: true,
      tiempoSalida: null
    };

    setNuevoCliente(clienteNuevo);

    nuevasCajas.forEach(caja => {
      caja.tiempoTotal = calcularTiempoTotal(caja);
    });

    if (nuevaCajaExpress) {
      nuevaCajaExpress.tiempoTotal = calcularTiempoTotal(nuevaCajaExpress);
    }

    configuracion.cajasSeleccionadas.forEach(indexCaja => {
      if (indexCaja < configuracion.numCajasNormales) {
        const caja = nuevasCajas[indexCaja];
        const clienteCopia = { ...clienteNuevo, id: `NUEVO_CAJA_${caja.id}` };
        caja.clientes.push(clienteCopia);
      } else if (nuevaCajaExpress && configuracion.articulosNuevoCliente <= 10) {
        const clienteCopia = { ...clienteNuevo, id: 'NUEVO_CAJA_EXPRESS' };
        nuevaCajaExpress.clientes.push(clienteCopia);
      }
    });

    setCajas(nuevasCajas);
    setCajaExpress(nuevaCajaExpress);
    setMostrarConfig(false);
    setTiempoTranscurrido(0);
    setAnalisisCompleto(null);
    setTodosLosClientesSalieron(false);
    setMostrarModalTerminado(false);
    setVistaActual('simular');
  };

  const simularPaso = () => {
    setTiempoTranscurrido(prev => prev + 1);
    const tiempoActual = tiempoTranscurrido + 1;

    setCajas(prevCajas => {
      return prevCajas.map(caja => {
        const nuevaCaja = { ...caja, clientes: [...caja.clientes] };

        if (nuevaCaja.clientes.length > 0) {
          const clienteActual = { ...nuevaCaja.clientes[0] };

          if (!clienteActual.enAtencion) {
            clienteActual.enAtencion = true;
            clienteActual.tiempoRestante = (clienteActual.articulos * nuevaCaja.tiempoEscaneo) + clienteActual.tiempoCobro;
            clienteActual.articulosRestantes = clienteActual.articulos;
          }

          if (clienteActual.articulosRestantes > 0 && clienteActual.tiempoRestante > clienteActual.tiempoCobro) {
            const articulosEscaneados = Math.floor((clienteActual.articulos * nuevaCaja.tiempoEscaneo - clienteActual.tiempoRestante + clienteActual.tiempoCobro) / nuevaCaja.tiempoEscaneo);
            clienteActual.articulosRestantes = Math.max(0, clienteActual.articulos - articulosEscaneados);
          } else {
            clienteActual.articulosRestantes = 0;
          }

          clienteActual.tiempoRestante -= 1;

          if (clienteActual.tiempoRestante <= 0) {
            if (clienteActual.esNuevoCliente) {
              clienteActual.tiempoSalida = tiempoActual;
            }
            nuevaCaja.clientes.shift();
            nuevaCaja.clientesAtendidos++;
          } else {
            nuevaCaja.clientes[0] = clienteActual;
          }
        }

        return nuevaCaja;
      });
    });

    if (cajaExpress) {
      setCajaExpress(prevExpress => {
        const nuevaExpress = { ...prevExpress, clientes: [...prevExpress.clientes] };

        if (nuevaExpress.clientes.length > 0) {
          const clienteActual = { ...nuevaExpress.clientes[0] };

          if (!clienteActual.enAtencion) {
            clienteActual.enAtencion = true;
            clienteActual.tiempoRestante = (clienteActual.articulos * nuevaExpress.tiempoEscaneo) + clienteActual.tiempoCobro;
            clienteActual.articulosRestantes = clienteActual.articulos;
          }

          if (clienteActual.articulosRestantes > 0 && clienteActual.tiempoRestante > clienteActual.tiempoCobro) {
            const articulosEscaneados = Math.floor((clienteActual.articulos * nuevaExpress.tiempoEscaneo - clienteActual.tiempoRestante + clienteActual.tiempoCobro) / nuevaExpress.tiempoEscaneo);
            clienteActual.articulosRestantes = Math.max(0, clienteActual.articulos - articulosEscaneados);
          } else {
            clienteActual.articulosRestantes = 0;
          }

          clienteActual.tiempoRestante -= 1;

          if (clienteActual.tiempoRestante <= 0) {
            if (clienteActual.esNuevoCliente) {
              clienteActual.tiempoSalida = tiempoActual;
            }
            nuevaExpress.clientes.shift();
            nuevaExpress.clientesAtendidos++;
          } else {
            nuevaExpress.clientes[0] = clienteActual;
          }
        }

        return nuevaExpress;
      });
    }
  };

  useEffect(() => {
    if (simulacionActiva) {
      intervaloRef.current = setInterval(() => {
        simularPaso();
      }, velocidadSimulacion);
    } else {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
      }
    }

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
      }
    };
  }, [simulacionActiva, velocidadSimulacion, tiempoTranscurrido, cajaExpress]);

  useEffect(() => {
    if (cajas.length === 0 || todosLosClientesSalieron) return;

    let nuevoClienteSalioDeTodasPartes = true;

    configuracion.cajasSeleccionadas.forEach(idx => {
      if (idx < configuracion.numCajasNormales && cajas[idx]) {
        const tieneNuevoCliente = cajas[idx].clientes.some(cl => cl.esNuevoCliente);
        if (tieneNuevoCliente) {
          nuevoClienteSalioDeTodasPartes = false;
        }
      } else if (idx === configuracion.numCajasNormales && cajaExpress) {
        const tieneNuevoCliente = cajaExpress.clientes.some(cl => cl.esNuevoCliente);
        if (tieneNuevoCliente) {
          nuevoClienteSalioDeTodasPartes = false;
        }
      }
    });

    if (nuevoClienteSalioDeTodasPartes && configuracion.cajasSeleccionadas.length > 0) {
      setTodosLosClientesSalieron(true);
      setSimulacionActiva(false);
      setMostrarModalTerminado(true);
      calcularAnalisis();
    }
  }, [cajas, cajaExpress, tiempoTranscurrido]);

  // NUEVA FUNCIÓN: Actualizar estadísticas acumuladas
  const actualizarEstadisticasAcumuladas = (analisis) => {
    setEstadisticasAcumuladas(prev => {
      const nuevasEstadisticas = { ...prev };

      analisis.resultados.forEach(resultado => {
        const key = resultado.nombre;
        
        if (!nuevasEstadisticas[key]) {
          nuevasEstadisticas[key] = {
            nombre: resultado.nombre,
            tipo: resultado.tipo,
            simulaciones: [],
            tiempos: [],
            cajeros: {
              'Novato': 0,
              'Normal': 0,
              'Experto': 0
            }
          };
        }

        nuevasEstadisticas[key].simulaciones.push({
          tiempoReal: resultado.tiempoReal,
          tiempoEstimado: resultado.tiempoEstimado,
          experiencia: resultado.experiencia,
          tiempoEscaneo: resultado.tiempoEscaneo,
          articulos: analisis.articulosCliente,
          fecha: analisis.fecha
        });

        nuevasEstadisticas[key].tiempos.push(resultado.tiempoReal);
        nuevasEstadisticas[key].cajeros[resultado.experiencia]++;
      });

      return nuevasEstadisticas;
    });
  };

  const calcularAnalisis = () => {
    const resultados = [];

    configuracion.cajasSeleccionadas.forEach(indexCaja => {
      if (indexCaja < configuracion.numCajasNormales) {
        const caja = cajas[indexCaja];
        const tiempoInicial = caja.tiempoTotal + (nuevoCliente.articulos * caja.tiempoEscaneo) + nuevoCliente.tiempoCobro;

        resultados.push({
          nombre: `Caja ${caja.id}`,
          tipo: 'normal',
          tiempoEstimado: tiempoInicial,
          tiempoReal: tiempoTranscurrido,
          experiencia: getNivelExperiencia(caja.tiempoEscaneo).nivel,
          tiempoEscaneo: caja.tiempoEscaneo
        });
      } else if (cajaExpress && nuevoCliente.articulos <= 10) {
        const tiempoInicial = cajaExpress.tiempoTotal + (nuevoCliente.articulos * cajaExpress.tiempoEscaneo) + nuevoCliente.tiempoCobro;

        resultados.push({
          nombre: 'Caja Express',
          tipo: 'express',
          tiempoEstimado: tiempoInicial,
          tiempoReal: tiempoTranscurrido,
          experiencia: getNivelExperiencia(cajaExpress.tiempoEscaneo).nivel,
          tiempoEscaneo: cajaExpress.tiempoEscaneo
        });
      }
    });

    if (resultados.length === 0) return;

    const mejorEstimado = resultados.reduce((mejor, actual) =>
      actual.tiempoEstimado < mejor.tiempoEstimado ? actual : mejor
    );

    const peorEstimado = resultados.reduce((peor, actual) =>
      actual.tiempoEstimado > peor.tiempoEstimado ? actual : peor
    );

    const analisis = {
      resultados,
      mejorEstimado,
      peorEstimado,
      diferenciaMaxima: peorEstimado.tiempoEstimado - mejorEstimado.tiempoEstimado,
      articulosCliente: nuevoCliente.articulos,
      tiempoReal: tiempoTranscurrido,
      fecha: new Date().toLocaleString()
    };

    setAnalisisCompleto(analisis);
    
    // NUEVO: Actualizar estadísticas acumuladas
    actualizarEstadisticasAcumuladas(analisis);
    
    setHistorialSimulaciones(prev => {
      const nuevoHistorial = [analisis, ...prev].slice(0, 10);
      return nuevoHistorial;
    });
  };

  const reiniciar = () => {
    setSimulacionActiva(false);
    setCajas([]);
    setCajaExpress(null);
    setNuevoCliente(null);
    setTiempoTranscurrido(0);
    setAnalisisCompleto(null);
    setTodosLosClientesSalieron(false);
    setErrorExpress('');
    setMostrarConfig(true);
    setMostrarModalTerminado(false);
    setCasoSeleccionado(null);
    setVistaActual('configurar');
  };

  const toggleCajaSeleccionada = (index) => {
    setConfiguracion(prev => {
      const nuevasSeleccionadas = prev.cajasSeleccionadas.includes(index)
        ? prev.cajasSeleccionadas.filter(i => i !== index)
        : [...prev.cajasSeleccionadas, index];

      return { ...prev, cajasSeleccionadas: nuevasSeleccionadas };
    });
  };

  const actualizarPersonasCaja = (index, valor) => {
    setConfiguracion(prev => {
      const nuevasPersonas = [...prev.personasPorCajaNormal];
      nuevasPersonas[index] = parseInt(valor) || 0;
      return { ...prev, personasPorCajaNormal: nuevasPersonas };
    });
    setCasoSeleccionado(null);
  };

  const ClienteIcono = ({ cliente, enAtencion, posicion }) => (
    <div className={`flex flex-col items-center p-2 m-1 rounded-lg transition-all duration-300 ${cliente.esNuevoCliente ? 'bg-gradient-to-br from-green-200 to-green-300 border-2 border-green-600 shadow-xl scale-110' : enAtencion ? 'bg-yellow-200 scale-105 shadow-lg' : 'bg-blue-100'}`}>
      {cliente.esNuevoCliente && (
        <div className="text-xs font-bold text-green-700 mb-1">¡TÚ!</div>
      )}
      <Users
        size={cliente.esNuevoCliente ? 28 : 24}
        className={cliente.esNuevoCliente ? 'text-green-700' : enAtencion ? 'text-yellow-600' : 'text-blue-600'}
      />
      <div className="text-xs mt-1 flex items-center gap-1">
        <ShoppingCart size={12} />
        <span className="font-semibold">
          {enAtencion ? cliente.articulosRestantes : cliente.articulos}
        </span>
      </div>
      {enAtencion && cliente.tiempoRestante > 0 && (
        <div className="text-xs text-red-600 font-bold mt-1">
          {cliente.tiempoRestante}s
        </div>
      )}
      {!enAtencion && posicion > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          #{posicion}
        </div>
      )}
    </div>
  );

  const ModalTerminado = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-bounce-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-green-600 mb-3">
          ¡Simulación Terminada!
        </h2>
        <p className="text-gray-700 mb-2">
          Has completado tu recorrido por las cajas del supermercado
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Tiempo total: <span className="font-bold text-blue-600">{formatearTiempo(tiempoTranscurrido)}</span>
        </p>
        <button
          onClick={() => setMostrarModalTerminado(false)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Ver Resultados
        </button>
      </div>
    </div>
  );

  if (mostrarTabla) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-blue-800">
              📊 Historial de Simulaciones
            </h1>
            <button
              onClick={() => setMostrarTabla(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Volver
            </button>
          </div>

          {historialSimulaciones.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
              <p>No hay simulaciones registradas aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border p-3 text-left">#</th>
                    <th className="border p-3 text-left">Fecha/Hora</th>
                    <th className="border p-3 text-left">Artículos</th>
                    <th className="border p-3 text-left">Mejor Opción</th>
                    <th className="border p-3 text-left">Tiempo Estimado</th>
                    <th className="border p-3 text-left">Tiempo Real</th>
                    <th className="border p-3 text-left">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {historialSimulaciones.map((sim, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border p-3 font-bold">{idx + 1}</td>
                      <td className="border p-3 text-sm">{sim.fecha}</td>
                      <td className="border p-3 text-center">
                        <span className="bg-blue-100 px-2 py-1 rounded">{sim.articulosCliente}</span>
                      </td>
                      <td className="border p-3">
                        <span className="font-semibold">{sim.mejorEstimado.nombre}</span>
                        <br />
                        <span className="text-xs text-gray-600">{sim.mejorEstimado.experiencia}</span>
                      </td>
                      <td className="border p-3 text-center font-semibold text-green-700">
                        {formatearTiempo(sim.mejorEstimado.tiempoEstimado)}
                      </td>
                      <td className="border p-3 text-center font-semibold text-blue-700">
                        {formatearTiempo(sim.tiempoReal)}
                      </td>
                      <td className="border p-3 text-center">
                        {sim.diferenciaMaxima > 0 ? (
                          <span className="text-orange-600 font-semibold">
                            {formatearTiempo(sim.diferenciaMaxima)}
                          </span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // NUEVO: Vista de Estadísticas Acumuladas
  if (mostrarEstadisticas) {
    const calcularEstadisticasCaja = (datos) => {
      if (!datos || datos.simulaciones.length === 0) return null;

      const tiempos = datos.tiempos;
      const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
      const mejorTiempo = Math.min(...tiempos);
      const peorTiempo = Math.max(...tiempos);
      const totalSimulaciones = datos.simulaciones.length;

      return {
        promedio: Math.round(promedio),
        mejor: mejorTiempo,
        peor: peorTiempo,
        total: totalSimulaciones,
        cajeros: datos.cajeros
      };
    };

    const todasLasCajas = Object.keys(estadisticasAcumuladas).map(key => ({
      nombre: key,
      ...calcularEstadisticasCaja(estadisticasAcumuladas[key]),
      tipo: estadisticasAcumuladas[key].tipo
    })).filter(c => c.promedio);

    const mejorCajaPromedio = todasLasCajas.length > 0 
      ? todasLasCajas.reduce((mejor, actual) => actual.promedio < mejor.promedio ? actual : mejor)
      : null;

    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-bold text-purple-800 flex items-center gap-3">
                  <Database size={40} />
                  Estadísticas Acumuladas
                </h1>
                <p className="text-gray-600 mt-2">
                  Análisis estadístico de {historialSimulaciones.length} simulaciones realizadas
                </p>
              </div>
              <button
                onClick={() => setMostrarEstadisticas(false)}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
              >
                ← Volver
              </button>
            </div>

            {todasLasCajas.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <TrendingUp size={80} className="mx-auto mb-4 opacity-30" />
                <h3 className="text-2xl font-semibold mb-2">No hay datos estadísticos</h3>
                <p>Realiza al menos una simulación para ver estadísticas</p>
              </div>
            ) : (
              <>
                {/* Resumen General */}
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6 mb-8 border-2 border-purple-300">
                  <h2 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                    <Target size={28} />
                    📊 Resumen General
                  </h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow">
                      <div className="text-sm text-gray-600 mb-1">Total Simulaciones</div>
                      <div className="text-3xl font-bold text-blue-600">{historialSimulaciones.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow">
                      <div className="text-sm text-gray-600 mb-1">Cajas Analizadas</div>
                      <div className="text-3xl font-bold text-purple-600">{todasLasCajas.length}</div>
                    </div>
                    {mejorCajaPromedio && (
                      <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 shadow">
                        <div className="text-sm text-green-700 font-semibold mb-1">🏆 Mejor Promedio</div>
                        <div className="text-2xl font-bold text-green-600">{mejorCajaPromedio.nombre}</div>
                        <div className="text-sm text-gray-600">{formatearTiempo(mejorCajaPromedio.promedio)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estadísticas por Caja */}
                <div className="space-y-6">
                  {todasLasCajas
                    .sort((a, b) => a.promedio - b.promedio)
                    .map((caja, idx) => {
                      const porcentajeNovato = ((caja.cajeros.Novato / caja.total) * 100).toFixed(0);
                      const porcentajeNormal = ((caja.cajeros.Normal / caja.total) * 100).toFixed(0);
                      const porcentajeExperto = ((caja.cajeros.Experto / caja.total) * 100).toFixed(0);
                      const esMejor = idx === 0;

                      return (
                        <div
                          key={caja.nombre}
                          className={`rounded-xl p-6 border-2 shadow-lg ${
                            esMejor
                              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-bold text-gray-800">
                                {caja.tipo === 'express' ? '🚀' : '🏪'} {caja.nombre}
                              </h3>
                              {esMejor && (
                                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                  ⭐ MEJOR PROMEDIO
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Simulaciones</div>
                              <div className="text-2xl font-bold text-purple-600">{caja.total}</div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={20} className="text-blue-600" />
                                <span className="text-sm font-semibold text-gray-700">Tiempo Promedio</span>
                              </div>
                              <div className="text-3xl font-bold text-blue-600">
                                {formatearTiempo(caja.promedio)}
                              </div>
                            </div>

                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingDown size={20} className="text-green-600" />
                                <span className="text-sm font-semibold text-gray-700">Mejor Tiempo</span>
                              </div>
                              <div className="text-3xl font-bold text-green-600">
                                {formatearTiempo(caja.mejor)}
                              </div>
                            </div>

                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={20} className="text-red-600" />
                                <span className="text-sm font-semibold text-gray-700">Peor Tiempo</span>
                              </div>
                              <div className="text-3xl font-bold text-red-600">
                                {formatearTiempo(caja.peor)}
                              </div>
                            </div>
                          </div>

                          {/* Distribución de Cajeros */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                              <Users size={20} />
                              Distribución de Cajeros Asignados:
                            </h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="w-24 text-sm font-semibold text-orange-600">🆕 Novato:</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="bg-orange-500 h-full flex items-center justify-end px-2"
                                    style={{ width: `${porcentajeNovato}%` }}
                                  >
                                    {porcentajeNovato > 15 && (
                                      <span className="text-white text-xs font-bold">{porcentajeNovato}%</span>
                                    )}
                                  </div>
                                </div>
                                <span className="w-16 text-sm font-semibold text-orange-700">
                                  {caja.cajeros.Novato}x
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="w-24 text-sm font-semibold text-blue-600">⭐ Normal:</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="bg-blue-500 h-full flex items-center justify-end px-2"
                                    style={{ width: `${porcentajeNormal}%` }}
                                  >
                                    {porcentajeNormal > 15 && (
                                      <span className="text-white text-xs font-bold">{porcentajeNormal}%</span>
                                    )}
                                  </div>
                                </div>
                                <span className="w-16 text-sm font-semibold text-blue-700">
                                  {caja.cajeros.Normal}x
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="w-24 text-sm font-semibold text-green-600">🏆 Experto:</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="bg-green-500 h-full flex items-center justify-end px-2"
                                    style={{ width: `${porcentajeExperto}%` }}
                                  >
                                    {porcentajeExperto > 15 && (
                                      <span className="text-white text-xs font-bold">{porcentajeExperto}%</span>
                                    )}
                                  </div>
                                </div>
                                <span className="w-16 text-sm font-semibold text-green-700">
                                  {caja.cajeros.Experto}x
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Conclusión */}
                          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                              <Star size={18} />
                              💡 Conclusión:
                            </h4>
                            <p className="text-sm text-gray-700">
                              {caja.cajeros.Experto > caja.cajeros.Novato && caja.cajeros.Experto > caja.cajeros.Normal
                                ? `Esta caja ha tenido suerte con ${caja.cajeros.Experto} cajeros expertos (${porcentajeExperto}%), lo que explica su buen promedio de ${formatearTiempo(caja.promedio)}.`
                                : caja.cajeros.Novato > caja.cajeros.Experto && caja.cajeros.Novato > caja.cajeros.Normal
                                ? `Esta caja ha sido asignada mayormente a cajeros novatos (${porcentajeNovato}%), lo que ha elevado su tiempo promedio a ${formatearTiempo(caja.promedio)}.`
                                : `Esta caja tiene una distribución equilibrada de cajeros, con un tiempo promedio consistente de ${formatearTiempo(caja.promedio)}.`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Conclusión Final */}
                <div className="mt-8 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                    <Award size={28} />
                    🎯 Conclusión General del Análisis
                  </h2>
                  <div className="space-y-3 text-gray-800">
                    <p className="text-lg">
                      Después de <strong>{historialSimulaciones.length} simulaciones</strong>, los datos muestran que:
                    </p>
                    {mejorCajaPromedio && (
                      <>
                        <p className="bg-white rounded-lg p-3 border-l-4 border-green-500">
                          ✅ <strong>{mejorCajaPromedio.nombre}</strong> tiene el mejor tiempo promedio con{' '}
                          <strong className="text-green-600">{formatearTiempo(mejorCajaPromedio.promedio)}</strong>
                          {mejorCajaPromedio.cajeros.Experto / mejorCajaPromedio.total > 0.5
                            ? ', principalmente porque le han tocado más cajeros expertos.'
                            : ', demostrando consistencia a pesar de la variabilidad de cajeros.'}
                        </p>
                        <p className="bg-white rounded-lg p-3 border-l-4 border-blue-500">
                          📊 La diferencia entre la mejor y peor caja es significativa, lo que demuestra la importancia de elegir bien.
                        </p>
                        <p className="bg-white rounded-lg p-3 border-l-4 border-purple-500">
                          🎲 La aleatoriedad de cajeros afecta los resultados, pero con suficientes simulaciones podemos identificar patrones reales.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const Sidebar = () => (
    <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen fixed left-0 top-0 shadow-2xl flex flex-col">
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🛒 SimuMarket
        </h1>
        <p className="text-xs text-blue-200 mt-1">Sistema de Simulación</p>
      </div>

      <nav className="flex-1 p-4">
        <button
          onClick={() => setVistaActual('configurar')}
          className={`w-full text-left p-3 rounded-lg mb-2 transition-all flex items-center gap-3 ${
            vistaActual === 'configurar'
              ? 'bg-white text-blue-900 shadow-lg font-semibold'
              : 'hover:bg-blue-700'
          }`}
        >
          <span className="text-xl">⚙️</span>
          <span>Configurar Simulación</span>
        </button>

        <button
          onClick={() => cajas.length > 0 && setVistaActual('simular')}
          disabled={cajas.length === 0}
          className={`w-full text-left p-3 rounded-lg mb-2 transition-all flex items-center gap-3 ${
            vistaActual === 'simular'
              ? 'bg-white text-blue-900 shadow-lg font-semibold'
              : cajas.length === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-700'
          }`}
        >
          <span className="text-xl">▶️</span>
          <span>Simular</span>
        </button>

        <button
          onClick={() => analisisCompleto && setVistaActual('resultados')}
          disabled={!analisisCompleto}
          className={`w-full text-left p-3 rounded-lg mb-2 transition-all flex items-center gap-3 ${
            vistaActual === 'resultados'
              ? 'bg-white text-blue-900 shadow-lg font-semibold'
              : !analisisCompleto
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-700'
          }`}
        >
          <span className="text-xl">📊</span>
          <span>Ver Resultados</span>
        </button>

        <div className="border-t border-blue-700 my-4"></div>

        <button
          onClick={() => setMostrarEstadisticas(true)}
          disabled={Object.keys(estadisticasAcumuladas).length === 0}
          className={`w-full text-left p-3 rounded-lg mb-2 transition-all flex items-center gap-3 ${
            Object.keys(estadisticasAcumuladas).length === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-purple-600 bg-purple-500'
          }`}
        >
          <span className="text-xl">📈</span>
          <span>Estadísticas</span>
          {Object.keys(estadisticasAcumuladas).length > 0 && (
            <span className="ml-auto bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              ✓
            </span>
          )}
        </button>

        <button
          onClick={() => setMostrarTabla(true)}
          className="w-full text-left p-3 rounded-lg mb-2 transition-all flex items-center gap-3 hover:bg-blue-700"
        >
          <span className="text-xl">📋</span>
          <span>Historial</span>
          {historialSimulaciones.length > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {historialSimulaciones.length}
            </span>
          )}
        </button>

        <button
          onClick={reiniciar}
          className="w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 hover:bg-red-600 bg-red-500"
        >
          <span className="text-xl">🔄</span>
          <span>Reiniciar Todo</span>
        </button>
      </nav>

      <div className="p-4 border-t border-blue-700 text-xs text-blue-200">
        <p>v2.0 - Con Estadísticas</p>
        <p className="mt-1">© 2024 SimuMarket</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-green-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-y-auto">
        {vistaActual === 'configurar' && <VistaConfiguracion />}
        {vistaActual === 'simular' && <VistaSimulacion />}
        {vistaActual === 'resultados' && <VistaResultados />}
      </div>
      {mostrarModalTerminado && <ModalTerminado />}
    </div>
  );

  function VistaConfiguracion() {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 overflow-auto">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2 text-blue-800">
            🛒 Simulación de Cajas de Supermercado
          </h1>
          <p className="text-center text-gray-600 mb-4">Configuración de escenario personalizado</p>

          <div className="mb-6 bg-purple-50 border border-purple-300 rounded-lg p-4">
            <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Zap size={20} />
              Casos de Prueba Rápidos:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(casosPredefinidos).map(([key, caso]) => (
                <button
                  key={key}
                  onClick={() => aplicarCaso(key)}
                  className={`p-3 border-2 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-all text-left relative ${
                    casoSeleccionado === key
                      ? 'bg-purple-200 border-purple-500 shadow-lg'
                      : 'bg-white border-purple-200'
                  }`}
                >
                  {casoSeleccionado === key && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                  <div className="font-semibold text-sm text-purple-800">{caso.nombre}</div>
                  <div className="text-xs text-gray-600 mt-1">{caso.descripcion}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3">🧑 Tu información:</h3>
              <label className="block text-sm font-medium mb-2">¿Cuántos artículos llevas?</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={configuracion.articulosNuevoCliente}
                onChange={(e) => {
                  const valor = e.target.value.replace(/[^0-9]/g, '');
                  setConfiguracion({ ...configuracion, articulosNuevoCliente: parseInt(valor) || 0 });
                }}
                className="w-full p-2 border-2 border-green-300 rounded-lg text-lg font-semibold text-center"
                placeholder="15"
              />
              {configuracion.articulosNuevoCliente > 10 && (
                <p className="text-xs text-orange-600 mt-1">⚠️ No podrás usar Caja Express (límite: 10 artículos)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Número de Cajas Normales</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={configuracion.numCajasNormales}
                onChange={(e) => {
                  const valor = e.target.value.replace(/[^0-9]/g, '');
                  const num = parseInt(valor) || 0;
                  const nuevasPersonas = Array.from({ length: num }, (_, i) => configuracion.personasPorCajaNormal[i] || 0);
                  setConfiguracion({
                    ...configuracion,
                    numCajasNormales: num,
                    personasPorCajaNormal: nuevasPersonas,
                    cajasSeleccionadas: []
                  });
                }}
                className="w-full p-2 border rounded-lg text-center"
                placeholder="3"
              />
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-300 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-3">👥 Personas en cada caja normal:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: configuracion.numCajasNormales }).map((_, i) => (
                <div key={i}>
                  <label className="block text-xs font-medium mb-1">Caja {i + 1}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={configuracion.personasPorCajaNormal[i] || 0}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/[^0-9]/g, '');
                      actualizarPersonasCaja(i, valor);
                    }}
                    className="w-full p-2 border rounded-lg text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={configuracion.incluirCajaExpress}
              onChange={(e) => setConfiguracion({ ...configuracion, incluirCajaExpress: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium">Incluir Caja Express (máx 10 artículos)</label>
          </div>

          {configuracion.incluirCajaExpress && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Personas en Caja Express</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={configuracion.personasCajaExpress}
                onChange={(e) => {
                  const valor = e.target.value.replace(/[^0-9]/g, '');
                  setConfiguracion({ ...configuracion, personasCajaExpress: parseInt(valor) || 0 });
                }}
                className="w-full p-2 border rounded-lg text-center"
                placeholder="0"
              />
            </div>
          )}

          <div className="mt-4 bg-purple-50 border border-purple-300 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">⚡ Experiencia de cajeros (aleatorio):</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <span className="text-xl">🆕</span> Novato:
                </label>
                <input
                  type="number"
                  value={configuracion.tiempoEscaneoNovato}
                  onChange={(e) => setConfiguracion({ ...configuracion, tiempoEscaneoNovato: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded mt-1 text-center"
                />
                <span className="text-xs text-gray-600">seg/artículo</span>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <span className="text-xl">⭐</span> Normal:
                </label>
                <input
                  type="number"
                  value={configuracion.tiempoEscaneoNormal}
                  onChange={(e) => setConfiguracion({ ...configuracion, tiempoEscaneoNormal: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded mt-1 text-center"
                />
                <span className="text-xs text-gray-600">seg/artículo</span>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <span className="text-xl">🏆</span> Experto:
                </label>
                <input
                  type="number"
                  value={configuracion.tiempoEscaneoExperto}
                  onChange={(e) => setConfiguracion({ ...configuracion, tiempoEscaneoExperto: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded mt-1 text-center"
                />
                <span className="text-xs text-gray-600">seg/artículo</span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-orange-50 border border-orange-300 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-3">⚙️ Configuraciones de simulación:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Artículos por persona (rango aleatorio)</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={configuracion.articulosAleatorios.min}
                      onChange={(e) => setConfiguracion({
                        ...configuracion,
                        articulosAleatorios: { ...configuracion.articulosAleatorios, min: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border rounded text-center"
                      placeholder="Mín"
                    />
                    <span className="text-xs text-gray-600">Mínimo</span>
                  </div>
                  <span>-</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={configuracion.articulosAleatorios.max}
                      onChange={(e) => setConfiguracion({
                        ...configuracion,
                        articulosAleatorios: { ...configuracion.articulosAleatorios, max: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border rounded text-center"
                      placeholder="Máx"
                    />
                    <span className="text-xs text-gray-600">Máximo</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  💳 Tiempo de cobro fijo (segundos)
                </label>
                <input
                  type="number"
                  value={configuracion.tiempoCobro}
                  onChange={(e) => setConfiguracion({ ...configuracion, tiempoCobro: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded text-center"
                  placeholder="20"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tiempo que toma procesar el pago (igual para todos)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-3">📍 Selecciona a qué cajas quieres ir:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Array.from({ length: configuracion.numCajasNormales }).map((_, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 p-2 border rounded-lg hover:bg-yellow-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={configuracion.cajasSeleccionadas.includes(i)}
                    onChange={() => toggleCajaSeleccionada(i)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Caja {i + 1}</span>
                </label>
              ))}
              {configuracion.incluirCajaExpress && (
                <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-yellow-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configuracion.cajasSeleccionadas.includes(configuracion.numCajasNormales)}
                    onChange={() => toggleCajaSeleccionada(configuracion.numCajasNormales)}
                    disabled={configuracion.articulosNuevoCliente > 10}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">🚀 Caja Express</span>
                </label>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Seleccionadas: {configuracion.cajasSeleccionadas.length} caja(s)
            </p>
          </div>

          {errorExpress && (
            <div className="mt-4 bg-red-100 border border-red-400 rounded-lg p-3 text-center">
              <p className="text-red-800 font-semibold">{errorExpress}</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={inicializarSimulacion}
              disabled={configuracion.cajasSeleccionadas.length === 0}
              className={`flex-1 py-3 rounded-lg font-semibold text-lg transition-colors ${
                configuracion.cajasSeleccionadas.length === 0
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {configuracion.cajasSeleccionadas.length === 0
                ? '⚠️ Selecciona al menos una caja'
                : '🎯 Iniciar Simulación'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function VistaSimulacion() {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2 text-blue-800">
              🛒 Simulación en Vivo
            </h1>
            <p className="text-gray-600 mb-4">
              Llevas {nuevoCliente?.articulos} artículos - En {configuracion.cajasSeleccionadas.length} caja(s)
            </p>

            <div className="flex flex-wrap gap-4 items-center justify-center">
              <button
                onClick={() => setSimulacionActiva(!simulacionActiva)}
                disabled={todosLosClientesSalieron}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  todosLosClientesSalieron
                    ? 'bg-gray-400 cursor-not-allowed'
                    : simulacionActiva
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                {simulacionActiva ? (
                  <>
                    <Pause size={20} /> Pausar
                  </>
                ) : (
                  <>
                    <Play size={20} /> Iniciar
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Velocidad:</label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={velocidadSimulacion}
                  onChange={(e) => setVelocidadSimulacion(parseInt(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm">{velocidadSimulacion}ms</span>
              </div>

              <div className="flex items-center gap-2 bg-blue-100 px-4 py-3 rounded-lg">
                <Clock size={20} />
                <span className="font-semibold text-lg">Tiempo: {formatearTiempo(tiempoTranscurrido)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cajas.map((caja, index) => {
              const tieneCliente = configuracion.cajasSeleccionadas.includes(index);
              const expInfo = getNivelExperiencia(caja.tiempoEscaneo);

              return (
                <div
                  key={caja.id}
                  className={`rounded-lg shadow-lg p-4 border-2 ${
                    tieneCliente ? 'bg-green-50 border-green-500' : 'bg-white border-blue-300 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-blue-700">Caja {caja.id}</h2>
                      <span className={`text-2xl ${expInfo.color}`} title={expInfo.nivel}>
                        {expInfo.icon}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{caja.tiempoEscaneo}s/art</span>
                      </div>
                      <div className={`text-xs font-semibold ${expInfo.color}`}>
                        {expInfo.nivel}
                      </div>
                    </div>
                  </div>

                  {!tieneCliente && (
                    <div className="text-xs text-gray-500 mb-2 italic">
                      No te formaste aquí
                    </div>
                  )}

                  <div className="mb-2 text-sm">
                    <p>Personas en fila: <span className="font-bold">{caja.clientes.length}</span></p>
                    <p>Tiempo estimado inicial: <span className="font-bold">{formatearTiempo(caja.tiempoTotal)}</span></p>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex flex-wrap min-h-[80px]">
                      {caja.clientes.map((cliente, idx) => (
                        <ClienteIcono
                          key={cliente.id}
                          cliente={cliente}
                          enAtencion={idx === 0 && cliente.enAtencion}
                          posicion={idx + 1}
                        />
                      ))}
                      {caja.clientes.length === 0 && (
                        <div className="text-gray-400 italic w-full text-center py-4">Caja vacía</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {cajaExpress && (
              <div
                className={`rounded-lg shadow-lg p-4 border-2 ${
                  configuracion.cajasSeleccionadas.includes(configuracion.numCajasNormales)
                    ? 'bg-green-50 border-green-500'
                    : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-400 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-red-700">🚀 Caja Express</h2>
                    <span className={`text-2xl ${getNivelExperiencia(cajaExpress.tiempoEscaneo).color}`}>
                      {getNivelExperiencia(cajaExpress.tiempoEscaneo).icon}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{cajaExpress.tiempoEscaneo}s/art</span>
                    </div>
                    <div className={`text-xs font-semibold ${getNivelExperiencia(cajaExpress.tiempoEscaneo).color}`}>
                      {getNivelExperiencia(cajaExpress.tiempoEscaneo).nivel}
                    </div>
                  </div>
                </div>

                {!configuracion.cajasSeleccionadas.includes(configuracion.numCajasNormales) && (
                  <div className="text-xs text-gray-500 mb-2 italic">
                    {nuevoCliente.articulos > 10 ? 'No cumples el requisito (>10 arts)' : 'No te formaste aquí'}
                  </div>
                )}

                <div className="mb-2 text-sm">
                  <p>Personas en fila: <span className="font-bold">{cajaExpress.clientes.length}</span></p>
                  <p>Tiempo estimado inicial: <span className="font-bold">{formatearTiempo(cajaExpress.tiempoTotal)}</span></p>
                  <p className="text-red-600 font-semibold">⚠️ Máximo 10 artículos</p>
                </div>

                <div className="border-t pt-2">
                  <div className="flex flex-wrap min-h-[80px]">
                    {cajaExpress.clientes.map((cliente, idx) => (
                      <ClienteIcono
                        key={cliente.id}
                        cliente={cliente}
                        enAtencion={idx === 0 && cliente.enAtencion}
                        posicion={idx + 1}
                      />
                    ))}
                    {cajaExpress.clientes.length === 0 && (
                      <div className="text-gray-400 italic w-full text-center py-4">Caja vacía</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function VistaResultados() {
    if (!analisisCompleto) {
      return (
        <div className="p-8">
          <div className="text-center py-12 text-gray-500">
            <AlertCircle size={64} className="mx-auto mb-4 opacity-50" />
            <p>No hay resultados disponibles. Completa una simulación primero.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-500 rounded-xl p-6 shadow-2xl">
            <h2 className="text-3xl font-bold text-purple-800 mb-6 text-center">
              🎉 ¡Análisis Completo - Resultados!
            </h2>

            <div className="bg-white rounded-lg p-6 shadow mb-6">
              <h3 className="font-bold text-xl mb-4">📊 Comparación de las cajas donde te formaste:</h3>
              <div className="space-y-3">
                {analisisCompleto.resultados
                  .sort((a, b) => a.tiempoEstimado - b.tiempoEstimado)
                  .map((resultado, idx) => {
                    const expInfo = getNivelExperiencia(resultado.tiempoEscaneo);
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg flex justify-between items-center ${
                          idx === 0
                            ? 'bg-green-100 border-2 border-green-500'
                            : idx === analisisCompleto.resultados.length - 1
                            ? 'bg-red-50 border border-red-300'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{resultado.nombre}</span>
                            <span className={`text-2xl ${expInfo.color}`} title={expInfo.nivel}>
                              {expInfo.icon}
                            </span>
                            <span className={`text-sm ${expInfo.color} font-semibold`}>
                              {expInfo.nivel}
                            </span>
                          </div>
                          {idx === 0 && (
                            <span className="text-xs bg-green-600 text-white px-3 py-1 rounded mt-2 inline-block">
                              MEJOR ELECCIÓN
                            </span>
                          )}
                          {idx === analisisCompleto.resultados.length - 1 && analisisCompleto.resultados.length > 1 && (
                            <span className="text-xs bg-red-600 text-white px-3 py-1 rounded mt-2 inline-block">
                              PEOR ELECCIÓN
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-2xl">{formatearTiempo(resultado.tiempoEstimado)}</div>
                          <div className="text-sm text-gray-500">{resultado.tiempoEscaneo}s por artículo</div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {analisisCompleto.resultados.length > 1 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-base font-semibold text-blue-800">
                    💡 Diferencia entre tu mejor y peor elección: {formatearTiempo(analisisCompleto.diferenciaMaxima)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {analisisCompleto.diferenciaMaxima > 30
                      ? '¡Elegir bien puede ahorrarte más de medio minuto!'
                      : 'La diferencia es pequeña, cualquier opción era buena.'}
                  </p>
                </div>
              )}
            </div>

            {configuracion.incluirCajaExpress &&
              configuracion.cajasSeleccionadas.includes(configuracion.numCajasNormales) &&
              nuevoCliente.articulos <= 10 && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-xl mb-3">🚀 Conclusión sobre Caja Express:</h3>
                  <p className="text-base text-gray-700">
                    {(() => {
                      const express = analisisCompleto.resultados.find((r) => r.tipo === 'express');
                      const normales = analisisCompleto.resultados.filter((r) => r.tipo === 'normal');
                      if (!express || normales.length === 0) return 'No hay datos suficientes para comparar.';

                      const mejorNormal = normales.sort((a, b) => a.tiempoEstimado - b.tiempoEstimado)[0];

                      if (express.tiempoEstimado < mejorNormal.tiempoEstimado) {
                        return `✅ La Caja Express FUE la mejor opción (${formatearTiempo(
                          express.tiempoEstimado
                        )} vs ${formatearTiempo(mejorNormal.tiempoEstimado)} de ${
                          mejorNormal.nombre
                        }). El límite de 10 artículos y la experiencia del cajero (${
                          express.experiencia
                        }) la hacen eficiente.`;
                      } else if (express.tiempoEstimado === mejorNormal.tiempoEstimado) {
                        return `⚖️ La Caja Express empató con ${mejorNormal.nombre} (ambas ${formatearTiempo(
                          express.tiempoEstimado
                        )}). Cualquiera de las dos hubiera sido buena opción.`;
                      } else {
                        const diferencia = express.tiempoEstimado - mejorNormal.tiempoEstimado;
                        return `❌ La Caja Express NO fue la mejor opción (${formatearTiempo(
                          express.tiempoEstimado
                        )} vs ${formatearTiempo(mejorNormal.tiempoEstimado)} de ${
                          mejorNormal.nombre
                        }). Perdiste ${formatearTiempo(
                          diferencia
                        )} por elegir Express. La cantidad de personas en fila superó la ventaja del límite de artículos.`;
                      }
                    })()}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }
};

export default SupermarketCheckoutSimulation;