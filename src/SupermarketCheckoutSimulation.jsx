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