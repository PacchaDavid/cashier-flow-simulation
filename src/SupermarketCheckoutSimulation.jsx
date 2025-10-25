import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Users, ShoppingCart, Clock } from 'lucide-react';

const SupermarketCheckoutSimulation = () => {
  const [cajas, setCajas] = useState([]);
  const [cajaExpress, setCajaExpress] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState(null);
  const [simulacionActiva, setSimulacionActiva] = useState(false);
  const [velocidadSimulacion, setVelocidadSimulacion] = useState(100);
  const [configuracion, setConfiguracion] = useState({
    numCajasNormales: 3,
    tiempoEscaneoNormal: 5,
    tiempoEscaneoExpress: 4,
    incluirCajaExpress: true,
    articulosNuevoCliente: 15
  });
  const [mostrarConfig, setMostrarConfig] = useState(true);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [analisisCompleto, setAnalisisCompleto] = useState(null);
  const [todosLosClientesSalieron, setTodosLosClientesSalieron] = useState(false);
  const intervaloRef = useRef(null);

  const generarCliente = (id, maxArticulos = 30, minArticulos = 5) => {
    const articulos = Math.floor(Math.random() * (maxArticulos - minArticulos + 1)) + minArticulos;
    const tiempoCobro = Math.floor(Math.random() * 16) + 15;
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

  const inicializarSimulacion = () => {
    const nuevasCajas = [];
    let clienteId = 1;

    for (let i = 0; i < configuracion.numCajasNormales; i++) {
      const clientes = [];
      const numPersonas = Math.floor(Math.random() * 3) + 2;
      for (let j = 0; j < numPersonas; j++) {
        clientes.push(generarCliente(clienteId++, 30, 5));
      }
      nuevasCajas.push({
        id: i + 1,
        tipo: 'normal',
        tiempoEscaneo: configuracion.tiempoEscaneoNormal,
        clientes,
        tiempoTotal: 0,
        clientesAtendidos: 0
      });
    }

    let nuevaCajaExpress = null;
    if (configuracion.incluirCajaExpress) {
      const clientesExpress = [];
      const numClientesExpress = Math.floor(Math.random() * 3) + 4;
      for (let j = 0; j < numClientesExpress; j++) {
        clientesExpress.push(generarCliente(clienteId++, 10, 3));
      }
      nuevaCajaExpress = {
        id: 'express',
        tipo: 'express',
        tiempoEscaneo: configuracion.tiempoEscaneoExpress,
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
      tiempoCobro: Math.floor(Math.random() * 16) + 15,
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

    nuevasCajas.forEach(caja => {
      caja.clientes.push({...clienteNuevo, id: `NUEVO_CAJA_${caja.id}`});
    });
    
    if (nuevaCajaExpress && clienteNuevo.articulos <= 10) {
      nuevaCajaExpress.clientes.push({...clienteNuevo, id: 'NUEVO_CAJA_EXPRESS'});
    }

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
  }, [simulacionActiva, velocidadSimulacion, tiempoTranscurrido]);

  useEffect(() => {
    if (cajas.length === 0) return;
    
    const todosClientesSalieron = cajas.every(c => c.clientes.length === 0) && 
                                   (!cajaExpress || cajaExpress.clientes.length === 0);
    
    if (todosClientesSalieron && !todosLosClientesSalieron) {
      setTodosLosClientesSalieron(true);
      setSimulacionActiva(false);
      calcularAnalisis();
    }
  }, [cajas, cajaExpress]);

  const calcularAnalisis = () => {
    const resultados = [];
    
    cajas.forEach(caja => {
      const tiempoInicial = caja.tiempoTotal + (nuevoCliente.articulos * caja.tiempoEscaneo) + nuevoCliente.tiempoCobro;
      resultados.push({
        nombre: `Caja ${caja.id}`,
        tipo: 'normal',
        tiempoEstimado: tiempoInicial,
        tiempoReal: tiempoTranscurrido
      });
    });
    
    if (cajaExpress && nuevoCliente.articulos <= 10) {
      const tiempoInicial = cajaExpress.tiempoTotal + (nuevoCliente.articulos * cajaExpress.tiempoEscaneo) + nuevoCliente.tiempoCobro;
      resultados.push({
        nombre: 'Caja Express',
        tipo: 'express',
        tiempoEstimado: tiempoInicial,
        tiempoReal: tiempoTranscurrido
      });
    }
    
    const mejorEstimado = resultados.reduce((mejor, actual) => 
      actual.tiempoEstimado < mejor.tiempoEstimado ? actual : mejor
    );
    
    const peorEstimado = resultados.reduce((peor, actual) => 
      actual.tiempoEstimado > peor.tiempoEstimado ? actual : peor
    );
    
    setAnalisisCompleto({
      resultados,
      mejorEstimado,
      peorEstimado,
      diferenciaMaxima: peorEstimado.tiempoEstimado - mejorEstimado.tiempoEstimado
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
    setMostrarConfig(true);
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

  if (mostrarConfig) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-blue-800">
            🛒 Simulación de Cajas de Supermercado
          </h1>
          <p className="text-center text-gray-600 mb-6">Validación de hipótesis: ¿En qué caja salgo más rápido?</p>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">🧑 Tu información como cliente:</h3>
              <label className="block text-sm font-medium mb-2">¿Cuántos artículos llevas?</label>
              <input
                type="number"
                min="1"
                max="50"
                value={configuracion.articulosNuevoCliente}
                onChange={(e) => setConfiguracion({...configuracion, articulosNuevoCliente: parseInt(e.target.value)})}
                className="w-full p-2 border-2 border-green-300 rounded-lg text-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Número de Cajas Normales</label>
              <input
                type="number"
                min="2"
                max="4"
                value={configuracion.numCajasNormales}
                onChange={(e) => setConfiguracion({...configuracion, numCajasNormales: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tiempo de Escaneo Normal (seg/artículo)</label>
              <input
                type="number"
                min="3"
                max="10"
                value={configuracion.tiempoEscaneoNormal}
                onChange={(e) => setConfiguracion({...configuracion, tiempoEscaneoNormal: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tiempo de Escaneo Express (seg/artículo)</label>
              <input
                type="number"
                min="3"
                max="10"
                value={configuracion.tiempoEscaneoExpress}
                onChange={(e) => setConfiguracion({...configuracion, tiempoEscaneoExpress: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={configuracion.incluirCajaExpress}
                onChange={(e) => setConfiguracion({...configuracion, incluirCajaExpress: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium">Incluir Caja Express (máx 10 artículos)</label>
            </div>
          </div>
          
          <button
            onClick={inicializarSimulacion}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            🎯 Iniciar Simulación
          </button>
          
          <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>💡 Nota:</strong> Estarás en TODAS las cajas simultáneamente para comparar tiempos reales.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-800">
          🛒 Simulación de Cajas de Supermercado
        </h1>
        <p className="text-center text-gray-600 mb-4">
          Llevas {nuevoCliente?.articulos} artículos - Estás en TODAS las cajas
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <button
              onClick={() => setSimulacionActiva(!simulacionActiva)}
              disabled={todosLosClientesSalieron}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
                todosLosClientesSalieron 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : simulacionActiva 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
              } text-white`}
            >
              {simulacionActiva ? <><Pause size={20} /> Pausar</> : <><Play size={20} /> Iniciar</>}
            </button>
            
            <button
              onClick={reiniciar}
              className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              <RotateCcw size={20} /> Nueva Simulación
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Velocidad:</label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={velocidadSimulacion}
                onChange={(e) => setVelocidadSimulacion(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="text-sm">{velocidadSimulacion}ms</span>
            </div>

            <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
              <Clock size={20} />
              <span className="font-semibold">Tiempo: {tiempoTranscurrido}s</span>
            </div>
          </div>
        </div>

        {todosLosClientesSalieron && analisisCompleto && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-500 rounded-lg p-6 mb-4">
            <h2 className="text-2xl font-bold text-purple-800 mb-4 text-center">
              🎉 ¡Análisis Completo!
            </h2>
            
            <div className="bg-white rounded-lg p-4 shadow mb-4">
              <h3 className="font-bold text-lg mb-3">📊 Comparación de Tiempos:</h3>
              <div className="space-y-2">
                {analisisCompleto.resultados
                  .sort((a, b) => a.tiempoEstimado - b.tiempoEstimado)
                  .map((resultado, idx) => (
                    <div key={idx} className={`p-3 rounded-lg flex justify-between items-center ${
                      idx === 0 
                        ? 'bg-green-100 border-2 border-green-500' 
                        : idx === analisisCompleto.resultados.length - 1
                          ? 'bg-red-50 border border-red-300'
                          : 'bg-gray-50'
                    }`}>
                      <div>
                        <span className="font-semibold">{resultado.nombre}</span>
                        {idx === 0 && <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">MEJOR</span>}
                        {idx === analisisCompleto.resultados.length - 1 && <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded">PEOR</span>}
                      </div>
                      <div className="font-bold text-lg">{resultado.tiempoEstimado}s</div>
                    </div>
                  ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-800">
                  💡 Diferencia: {analisisCompleto.diferenciaMaxima}s entre mejor y peor opción
                </p>
              </div>
            </div>

            <button
              onClick={reiniciar}
              className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              🔄 Nueva Simulación
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cajas.map((caja) => (
            <div key={caja.id} className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-300">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-blue-700">Caja {caja.id}</h2>
                <div className="text-sm">
                  <Clock size={16} className="inline" /> {caja.tiempoEscaneo}s/art
                </div>
              </div>
              
              <div className="mb-2 text-sm">
                <p>En fila: <span className="font-bold">{caja.clientes.length}</span></p>
                <p>Tiempo estimado: <span className="font-bold">{caja.tiempoTotal}s</span></p>
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
          ))}
          
          {cajaExpress && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg shadow-lg p-4 border-2 border-red-400">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-red-700">🚀 Caja Express</h2>
                <div className="text-sm">
                  <Clock size={16} className="inline" /> {cajaExpress.tiempoEscaneo}s/art
                </div>
              </div>
              
              <div className="mb-2 text-sm">
                <p>En fila: <span className="font-bold">{cajaExpress.clientes.length}</span></p>
                <p>Tiempo estimado: <span className="font-bold">{cajaExpress.tiempoTotal}s</span></p>
                <p className="text-red-600 font-semibold">⚠️ Máx 10 artículos</p>
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
};

export default SupermarketCheckoutSimulation;