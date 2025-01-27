import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    projectId: "TU_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let servicioActivo = null;

const nombreInput = document.getElementById('nombreInput');
const fechaInput = document.getElementById('fechaInput');
const rangoInput = document.getElementById('rangoInput');
const iniciarServicioBtn = document.getElementById('iniciarServicio');
const finalizarServicioBtn = document.getElementById('finalizarServicio');
const servicioTableBody = document.getElementById('servicioTableBody');
const buscarInput = document.getElementById('buscarInput');
const buscarButton = document.getElementById('buscarButton');

iniciarServicioBtn.addEventListener('click', iniciarServicio);
finalizarServicioBtn.addEventListener('click', finalizarServicio);
buscarButton.addEventListener('click', buscarPorNombre);

function iniciarServicio() {
    if (!nombreInput.value || !fechaInput.value || !rangoInput.value) {
        alert('Por favor, complete todos los campos');
        return;
    }

    servicioActivo = {
        nombre: nombreInput.value,
        fecha: fechaInput.value,
        rango: rangoInput.value,
        horaInicio: new Date(),
        horaFin: null
    };

    iniciarServicioBtn.disabled = true;
    finalizarServicioBtn.disabled = false;
    
    Notification.requestPermission().then(function(permission) {
        if (permission === 'granted') {
            new Notification('Servicio Iniciado', {
                body: `${servicioActivo.nombre} ha iniciado servicio`
            });
        }
    });
}

function finalizarServicio() {
    if (!servicioActivo) return;

    servicioActivo.horaFin = new Date();
    const tiempoTotal = calcularTiempoTotal(servicioActivo.horaInicio, servicioActivo.horaFin);

    guardarServicio(servicioActivo, tiempoTotal);

    iniciarServicioBtn.disabled = false;
    finalizarServicioBtn.disabled = true;
    servicioActivo = null;

    Notification.requestPermission().then(function(permission) {
        if (permission === 'granted') {
            new Notification('Servicio Finalizado', {
                body: `${nombreInput.value} ha finalizado servicio`
            });
        }
    });
}

function calcularTiempoTotal(inicio, fin) {
    const diff = fin - inicio;
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    return { horas, minutos, segundos };
}

async function guardarServicio(servicio, tiempoTotal) {
    try {
        await addDoc(collection(db, 'servicios'), {
            ...servicio,
            tiempoTotal: `${tiempoTotal.horas}h ${tiempoTotal.minutos}m ${tiempoTotal.segundos}s`
        });
    } catch (error) {
        console.error("Error guardando servicio: ", error);
    }
}

function buscarPorNombre() {
    const nombreBusqueda = buscarInput.value.toLowerCase();
    const filas = servicioTableBody.getElementsByTagName('tr');
    
    for (let fila of filas) {
        const nombreCelda = fila.getElementsByTagName('td')[0];
        if (nombreCelda) {
            const nombreTexto = nombreCelda.textContent.toLowerCase();
            fila.style.display = nombreTexto.includes(nombreBusqueda) ? '' : 'none';
        }
    }
}

function cargarServicios() {
    const q = query(collection(db, 'servicios'), orderBy('horaInicio', 'desc'));
    
    onSnapshot(q, (querySnapshot) => {
        servicioTableBody.innerHTML = '';
        const horasPorPersona = {};

        querySnapshot.forEach((doc) => {
            const datos = doc.data();
            const fila = document.createElement('tr');
            
            fila.innerHTML = `
                <td>${datos.nombre}</td>
                <td>${datos.fecha}</td>
                <td>${datos.rango}</td>
                <td>${datos.horaInicio.toDate().toLocaleString()}</td>
                <td>${datos.horaFin ? datos.horaFin.toDate().toLocaleString() : 'En curso'}</td>
                <td>${datos.tiempoTotal}</td>
                <td>${calcularHorasSemanales(horasPorPersona, datos)}</td>
            `;

            servicioTableBody.appendChild(fila);
        });
    });
}

function calcularHorasSemanales(horasPorPersona, datos) {
    const semanaActual = new Date().getWeekNumber();
    const añoActual = new Date().getFullYear();
    const fechaServicio = new Date(datos.fecha);
    
    if (fechaServicio.getWeekNumber() === semanaActual && fechaServicio.getFullYear() === añoActual) {
        const tiempoTotal = parsearTiempoTotal(datos.tiempoTotal);
        
        if (!horasPorPersona[datos.nombre]) {
            horasPorPersona[datos.nombre] = tiempoTotal;
        } else {
            horasPorPersona[datos.nombre] += tiempoTotal;
        }
        
        return horasPorPersona[datos.nombre] >= 28 ? 
            `${horasPorPersona[datos.nombre]}h (Completo)` : 
            `${horasPorPersona[datos.nombre]}h`;
    }
    
    return 'N/A';
}

function parsearTiempoTotal(tiempoTotal) {
    const match = tiempoTotal.match(/(\d+)h/);
    return match ? parseInt(match[1]) : 0;
}

// Métodos de utilidad para calcular número de semana
Date.prototype.getWeekNumber = function() {
    const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
    const dayNum = d.getUTCDay();
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const dayDiff = (d - firstThursday) / 86400000;
    return Math.ceil(dayDiff / 7);
};

// Inicializar carga de servicios
cargarServicios();