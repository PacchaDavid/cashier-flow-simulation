# Cashier Flow Simulation

Este repositorio contiene una simulación de filas en un supermercado, diseñada para ayudar a los clientes a determinar en qué caja registradora deben colocarse para optimizar su tiempo de salida. La simulación considera varios factores que influyen en el tiempo total de espera, incluyendo la cantidad de personas y artículos en cada fila, e introduce una "Caja Express" para evaluar su eficiencia.

## 🎯 Objetivo

El objetivo principal es modelar diferentes escenarios de filas de supermercado y calcular el tiempo total estimado para cada una, permitiendo a un nuevo cliente identificar la opción más rápida para ser atendido.

## ✨ Características de la Simulación

La simulación se configura con los siguientes parámetros:

1.  **Personas por Fila:** La cantidad de clientes en cada caja, que puede será configurable para probar distintos escenarios.
2.  **Artículos por Persona:** Cada cliente tendrá un número aleatorio de artículos (entre 1 y 50).
3.  **Tiempo de Escaneo por Artículo:** Un valor constante que varía según el tipo de cajero (ej. 5 segundos para un cajero normal, 9 segundos para un cajero principiante).
4.  **Tiempo de Cobro:** Un tiempo aleatorio (entre 15 y 30 segundos) por cliente, que dependerá del método de pago.

## ⚙️ Lógica de Cálculo

### Tiempo Total por Persona
Para cada cliente, se calcula el tiempo total de atención sumando el tiempo de escaneo de sus artículos y el tiempo de cobro.

### Tiempo Total por Caja
El tiempo total de una caja se obtiene sumando los tiempos de atención de todas las personas que se encuentran en su fila.

### Determinación de la Mejor Opción
La simulación comparará el tiempo total de cada caja para determinar cuál es la más rápida para un nuevo cliente.

## ⚡ Caja Express

Se incorporará una "Caja Express" con un límite de 10 artículos por cliente. Se validará si esta caja realmente agiliza el proceso o si, por la mayor afluencia de personas que suele atraer, puede resultar más lenta que una caja regular con menos clientes pero con carritos más llenos.