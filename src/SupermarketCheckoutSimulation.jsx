import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Users, ShoppingCart, Clock, TrendingDown, AlertCircle, Award, Star, BarChart3, Zap } from 'lucide-react';

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
    tiempoCobro: { min: 15, max: 30 },
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
  const intervaloRef = useRef(null);

  // Casos predefinidos para probar
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
    const tiempoCobro = Math.floor(Math.random() * (configuracion.tiempoCobro.max - configuracion.tiempoCobro.min + 1)) + configuracion.tiempoCobro.min;
    return {
      id,
      articulos,
      articulosRestantes: articulos,
      tiempoCobro,
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
    }
  };

  const inicializarSimulacion = () => {
    // Validar caja express
    if (configuracion.articulosNuevoCliente > 10 && 
        configuracion.incluirCajaExpress && 
        configuracion.cajasSeleccionadas.includes(configuracion.numCajasNormales)) {
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

    // Crear array de tipos de cajero para asignar aleatoriamente
    const tiposEscaneo = [
      configuracion.tiempoEscaneoNovato,
      configuracion.tiempoEscaneoNormal,
      configuracion.tiempoEscaneoExperto
    ];
    
    const tiposAsignados = [];
    for (let i = 0; i < configuracion.numCajasNormales + (configuracion.incluirCajaExpress ? 1 : 0); i++) {
      tiposAsignados.push(tiposEscaneo[Math.floor(Math.random() * tiposEscaneo.length)]);
    }

    // Usar los rangos configurados de artículos
    const minArticulos = configuracion.articulosAleatorios.min;
    const maxArticulos = configuracion.articulosAleatorios.max;

    for (let i = 0; i < configuracion.numCajasNormales; i++) {
      const clientes = [];
      const numPersonas = configuracion.personasPorCajaNormal[i] || 3;
      for (let j = 0; j < numPersonas; j++) {
        clientes.push(generarCliente(clienteId++, maxArticulos, minArticulos));
      }
      
      nuevasCajas.push({
        id: i + 1,
        tipo: 'normal',
        tiempoEscaneo: tiposAsignados[i],
        clientes,
        tiempoTotal: 0,
        clientesAtendidos: 0
      });
    }

    let nuevaCajaExpress = null;
    if (configuracion.incluirCajaExpress) {
      const clientesExpress = [];
      const numClientesExpress = configuracion.personasCajaExpress;
      // Caja express siempre tiene artículos entre 1 y 10 (respetando el rango si es menor)
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
        limiteArticulos: 10
      };
    }

    const clienteNuevo = {
      id: 'NUEVO',
      articulos: configuracion.articulosNuevoCliente,
      articulosRestantes: configuracion.articulosNuevoCliente,
      tiempoCobro: Math.floor(Math.random() * (configuracion.tiempoCobro.max - configuracion.tiempoCobro.min + 1)) + configuracion.tiempoCobro.min,
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

    // Agregar el nuevo cliente AL FINAL de las cajas SELECCIONADAS
    configuracion.cajasSeleccionadas.forEach(indexCaja => {
      if (indexCaja < configuracion.numCajasNormales) {
        const caja = nuevasCajas[indexCaja];
        const clienteCopia = {...clienteNuevo, id: `NUEVO_CAJA_${caja.id}`};
        caja.clientes.push(clienteCopia);
      } else if (nuevaCajaExpress && configuracion.articulosNuevoCliente <= 10) {
        const clienteCopia = {...clienteNuevo, id: 'NUEVO_CAJA_EXPRESS'};
        nuevaCajaExpress.clientes.push(clienteCopia);
      }
    });

    setCajas(nuevasCajas);
    setCajaExpress(nuevaCajaExpress);
    setMostrarConfig(false);
    setTiempoTranscurrido(0);
    setAnalisisCompleto(null);
    setTodosLosClientesSalieron(false);
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
      
      // Verificar si el nuevo cliente salió de todas las cajas donde se formó
      let nuevoClienteSalioDeTodasPartes = true;
      
      configuracion.cajasSeleccionadas.forEach(idx => {
        if (idx < configuracion.numCajasNormales && cajas[idx]) {
          // Verificar si el nuevo cliente todavía está en esta caja
          const tieneNuevoCliente = cajas[idx].clientes.some(cl => cl.esNuevoCliente);
          if (tieneNuevoCliente) {
            nuevoClienteSalioDeTodasPartes = false;
          }
        } else if (idx === configuracion.numCajasNormales && cajaExpress) {
          // Verificar en caja express
          const tieneNuevoCliente = cajaExpress.clientes.some(cl => cl.esNuevoCliente);
          if (tieneNuevoCliente) {
            nuevoClienteSalioDeTodasPartes = false;
          }
        }
      });
      
      if (nuevoClienteSalioDeTodasPartes && configuracion.cajasSeleccionadas.length > 0) {
        setTodosLosClientesSalieron(true);
        setSimulacionActiva(false);
        calcularAnalisis();
      }
    }, [cajas, cajaExpress, tiempoTranscurrido]);
  
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
      
      setHistorialSimulaciones(prev => {
        const nuevoHistorial = [analisis, ...prev].slice(0, 5);
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
    };
  
    const ClienteIcono = ({ cliente, enAtencion, posicion }) => (
      <div className={`flex flex-col items-center p-2 m-1 rounded-lg transition-all duration-300 ${
        cliente.esNuevoCliente 
          ? 'bg-gradient-to-br from-green-200 to-green-300 border-2 border-green-600 shadow-xl scale-110' 
          : enAtencion 
            ? 'bg-yellow-200 scale-105 shadow-lg' 
            : 'bg-blue-100'
      }`}>
        {cliente.esNuevoCliente && (
          <div className="text-xs font-bold text-green-700 mb-1">¡TÚ!</div>
        )}
        <Users size={cliente.esNuevoCliente ? 28 : 24} 
               className={cliente.esNuevoCliente ? 'text-green-700' : enAtencion ? 'text-yellow-600' : 'text-blue-600'} />
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
    
   if (mostrarConfig) {
      return (
        <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-2 text-blue-800">
              🛒 Simulación de Cajas de Supermercado
            </h1>
            <p className="text-center text-gray-600 mb-4">Configuración de escenario personalizado</p>
            
            {/* Casos Predefinidos */}
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
                    className="p-3 bg-white border-2 border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-all text-left"
                  >
                    <div className="font-semibold text-sm text-purple-800">{caso.nombre}</div>
                    <div className="text-xs text-gray-600 mt-1">{caso.descripcion}</div>
                  </button>
                ))}
              </div>
            </div>
  
            <div className="grid md:grid-cols-2 gap-4">
              {/* Cliente */}
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
                    setConfiguracion({...configuracion, articulosNuevoCliente: parseInt(valor) || 1});
                  }}
                  onBlur={(e) => {
                    const num = parseInt(e.target.value) || 1;
                    if (num > 100) setConfiguracion({...configuracion, articulosNuevoCliente: 100});
                    if (num < 1) setConfiguracion({...configuracion, articulosNuevoCliente: 1});
                  }}
                  className="w-full p-2 border-2 border-green-300 rounded-lg text-lg font-semibold text-center"
                  placeholder="15"
                />
                {configuracion.articulosNuevoCliente > 10 && (
                  <p className="text-xs text-orange-600 mt-1">⚠️ No podrás usar Caja Express (límite: 10 artículos)</p>
                )}
              </div>
  
              {/* Cajas */}
              <div>
                <label className="block text-sm font-medium mb-2">Número de Cajas Normales</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={configuracion.numCajasNormales}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/[^0-9]/g, '');
                    const num = parseInt(valor) || 1;
                    if (num >= 1 && num <= 5) {
                      const nuevasPersonas = Array.from({length: num}, (_, i) => configuracion.personasPorCajaNormal[i] || Math.floor(Math.random() * 3) + 2);
                      setConfiguracion({
                        ...configuracion, 
                        numCajasNormales: num,
                        personasPorCajaNormal: nuevasPersonas,
                        cajasSeleccionadas: []
                      });
                    }
                  }}
                  onBlur={(e) => {
                    const num = parseInt(e.target.value) || 1;
                    if (num > 5 || num < 1) {
                      const validNum = Math.max(1, Math.min(5, num));
                      const nuevasPersonas = Array.from({length: validNum}, (_, i) => configuracion.personasPorCajaNormal[i] || Math.floor(Math.random() * 3) + 2);
                      setConfiguracion({
                        ...configuracion, 
                        numCajasNormales: validNum,
                        personasPorCajaNormal: nuevasPersonas,
                        cajasSeleccionadas: []
                      });
                    }
                  }}
                  className="w-full p-2 border rounded-lg text-center"
                  placeholder="3"
                />
              </div>
            </div>
  
            {/* Personas por caja */}
            <div className="mt-4 bg-blue-50 border border-blue-300 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3">👥 Personas en cada caja normal:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({length: configuracion.numCajasNormales}).map((_, i) => (
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
                      onBlur={(e) => {
                        const num = parseInt(e.target.value) || 0;
                        if (num > 50) actualizarPersonasCaja(i, '50');
                        if (num < 0) actualizarPersonasCaja(i, '0');
                      }}
                      className="w-full p-2 border rounded-lg text-center"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
  
            {/* Express */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={configuracion.incluirCajaExpress}
                onChange={(e) => setConfiguracion({...configuracion, incluirCajaExpress: e.target.checked})}
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
                    setConfiguracion({...configuracion, personasCajaExpress: parseInt(valor) || 0});
                  }}
                  onBlur={(e) => {
                    const num = parseInt(e.target.value) || 0;
                    if (num > 50) setConfiguracion({...configuracion, personasCajaExpress: 50});
                    if (num < 0) setConfiguracion({...configuracion, personasCajaExpress: 0});
                  }}
                  className="w-full p-2 border rounded-lg text-center"
                  placeholder="0"
                />
              </div>
            )}
  
            {/* Experiencia */}
            <div className="mt-4 bg-purple-50 border border-purple-300 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2">⚡ Experiencia de cajeros (aleatorio):</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <span className="text-xl">🆕</span> Novato:
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="12"
                    value={configuracion.tiempoEscaneoNovato}
                    onChange={(e) => setConfiguracion({...configuracion, tiempoEscaneoNovato: parseInt(e.target.value) || 8})}
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
                    min="3"
                    max="8"
                    value={configuracion.tiempoEscaneoNormal}
                    onChange={(e) => setConfiguracion({...configuracion, tiempoEscaneoNormal: parseInt(e.target.value) || 5})}
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
                    min="1"
                    max="5"
                    value={configuracion.tiempoEscaneoExperto}
                    onChange={(e) => setConfiguracion({...configuracion, tiempoEscaneoExperto: parseInt(e.target.value) || 3})}
                    className="w-full p-2 border rounded mt-1 text-center"
                  />
                  <span className="text-xs text-gray-600">seg/artículo</span>
                </div>
              </div>
            </div>
  
            {/* Configuraciones adicionales */}
            <div className="mt-4 bg-orange-50 border border-orange-300 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 mb-3">⚙️ Configuraciones de simulación:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Artículos por persona (rango aleatorio)</label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={configuracion.articulosAleatorios.min}
                        onChange={(e) => setConfiguracion({
                          ...configuracion, 
                          articulosAleatorios: {...configuracion.articulosAleatorios, min: parseInt(e.target.value) || 1}
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
                        min="1"
                        max="100"
                        value={configuracion.articulosAleatorios.max}
                        onChange={(e) => setConfiguracion({
                          ...configuracion, 
                          articulosAleatorios: {...configuracion.articulosAleatorios, max: parseInt(e.target.value) || 50}
                        })}
                        className="w-full p-2 border rounded text-center"
                        placeholder="Máx"
                      />
                      <span className="text-xs text-gray-600">Máximo</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tiempo de cobro (depende del método de pago del cliente)</label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={configuracion.tiempoCobro.min}
                        onChange={(e) => setConfiguracion({
                          ...configuracion, 
                          tiempoCobro: {...configuracion.tiempoCobro, min: parseInt(e.target.value) || 15}
                        })}
                        className="w-full p-2 border rounded text-center"
                        placeholder="Mín"
                      />
                      <span className="text-xs text-gray-600">Mín (seg) - Ej: tarjeta</span>
                    </div>
                    <span>-</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={configuracion.tiempoCobro.max}
                        onChange={(e) => setConfiguracion({
                          ...configuracion, 
                          tiempoCobro: {...configuracion.tiempoCobro, max: parseInt(e.target.value) || 30}
                        })}
                        className="w-full p-2 border rounded text-center"
                        placeholder="Máx"
                      />
                      <span className="text-xs text-gray-600">Máx (seg) - Ej: efectivo</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💳 El tiempo de cobro es aleatorio porque depende de cómo pague cada cliente, no del cajero.
                  </p>
                </div>
              </div>
            </div>
  
            {/* Selección de cajas */}
            <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-3">📍 Selecciona a qué cajas quieres ir:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Array.from({length: configuracion.numCajasNormales}).map((_, i) => (
                  <label key={i} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-yellow-100 cursor-pointer">
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