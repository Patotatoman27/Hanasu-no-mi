const fs = require('fs');

// Inicializa las variables
let frutas = { frutas: [] };
let usuarios = { usuarios: [] };

// Función para cargar frutas desde el archivo JSON
function cargarFrutas() {
    try {
        const data = fs.readFileSync('frutas.json', 'utf-8');
        frutas = JSON.parse(data); // Carga las frutas en la variable
        console.log('Frutas cargadas con éxito:', frutas);
    } catch (error) {
        console.error('Error al cargar frutas:', error);
    }
}

// Función para guardar frutas en el archivo JSON
function guardarFrutas(name, nameRom, descripcion, imagen, owner) {
    // Verifica si la fruta ya existe
    const frutaExistente = frutas.frutas.find(fruta => fruta.name === name);
    
    if (frutaExistente) {
        // Si existe, actualiza la descripción y el dueño
        frutaExistente.nameRom = nameRom;
        frutaExistente.descripcion = descripcion;
        frutaExistente.imagen = imagen;
        frutaExistente.owner = owner;
        console.log(`Cambiada las propiedades de la fruta`);
    } else {
        // Si no existe, añade una nueva fruta
        const nuevaFruta = { name, nameRom, descripcion, imagen, owner };
        frutas.frutas.push(nuevaFruta);
    }

    // Guarda la lista actualizada de frutas en el archivo JSON
    fs.writeFileSync('frutas.json', JSON.stringify(frutas, null, 2), 'utf-8');
}

function guardarFrutasRst(frutas) {
    fs.writeFileSync('frutas.json', JSON.stringify(frutas, null, 2), 'utf-8');
}

function guardarUsuariosRst(usuarios) {
    fs.writeFileSync('usuarios.json', JSON.stringify(usuarios, null, 2), 'utf-8');
}

function cargarUsuarios() {
    try {
        const data = fs.readFileSync('usuarios.json', 'utf-8');
        usuarios = JSON.parse(data); // Carga los usuarios en la variable
        console.log('Usuarios cargados con éxito:', usuarios);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        // Inicializa la estructura si no existe
        usuarios = { usuarios: [] };
        console.log('Estructura de usuarios inicializada.');
    }
}



function guardarUsuarios(userId, nombre, nombreRom) {
    // Obtiene la lista actual de usuarios desde la estructura
    const usuarios = getUsuarios(); // Asegúrate de que esta función devuelve la estructura correcta

    if (!usuarios || !Array.isArray(usuarios.usuarios)) {
        console.error("La estructura de usuarios no está definida correctamente.");
        return;
    }

    // Verifica si el usuario ya existe en la lista
    const usuarioIndex = usuarios.usuarios.findIndex(usuario => usuario.id === userId);

    if (nombre === null) {
        // Si el nombre es null, eliminamos al usuario de la lista
        if (usuarioIndex !== -1) {
            usuarios.usuarios.splice(usuarioIndex, 1); // Elimina el usuario de la lista
            console.log(`Usuario con ID ${userId} ha sido eliminado de la lista.`);
        }
    } else {
        // Si no es null, actualizamos o añadimos el usuario
        if (usuarioIndex !== -1) {
            // Si el usuario existe, actualiza el nombre y nombreRom
            usuarios.usuarios[usuarioIndex].nombre = nombre;
            usuarios.usuarios[usuarioIndex].nombreRom = nombreRom;
        } else {
            // Si el usuario no existe, lo añade a la lista
            const nuevoUsuario = { id: userId, nombre: nombre, nombreRom: nombreRom };
            usuarios.usuarios.push(nuevoUsuario);
        }
    }

    // Guarda la lista actualizada de usuarios en el archivo JSON
    fs.writeFileSync('usuarios.json', JSON.stringify(usuarios, null, 2), 'utf-8');
}



function getFrutas() {
    try {
        const data = fs.readFileSync('frutas.json', 'utf-8'); // Leer el archivo JSON
        return JSON.parse(data); // Devolver el objeto JavaScript
    } catch (error) {
        console.error('Error al cargar frutas:', error);
        return { frutas: [] }; // Retornar un objeto vacío en caso de error
    }
}

function getUsuarios() {
    try {
        const data = fs.readFileSync('usuarios.json', 'utf-8'); // Leer el archivo JSON
        return JSON.parse(data); // Devolver el objeto JavaScript
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        return {}; // Retornar un objeto vacío en caso de error
    }
}


// Exporta las funciones y variables necesarias
module.exports = {
    cargarFrutas,
    guardarFrutas,
    cargarUsuarios,
    guardarUsuarios,
    guardarFrutasRst,
    guardarUsuariosRst,
    getFrutas,
    getUsuarios
}
