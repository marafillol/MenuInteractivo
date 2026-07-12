
// =======================================================
// MODELO MENU
// =======================================================
//
// Este modelo contiene todas las operaciones relacionadas
// con la entidad Menu.
//
// Responsabilidades:
// - Obtener menús almacenados.
// - Crear nuevos menús.
// - Actualizar menús existentes.
// - Eliminar menús.
// - Consultar menús específicos.
// - Verificar cantidad de fichas asociadas.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//
// La comunicación se realiza directamente con SQLite.
//

const db = require("../database");






// =======================================================
// OBTENER TODOS LOS MENÚS
// =======================================================
//
// Obtiene todos los menús registrados en la base de datos.
//
// Retorna:
// Lista completa de menús.
//

const obtenerMenus = () => {

    return new Promise((resolve, reject) => {

        db.all(
            "SELECT * FROM menu",
            [],
            (error, filas) => {

                if (error) {

                    reject(error);

                } else {

                    resolve(filas);

                }

            }
        );

    });

};






// =======================================================
// ACTUALIZAR MENÚ
// =======================================================
//
// Modifica los datos de un menú existente.
//
// Actualiza:
// - Nombre.
// - Descripción.
// - Imagen.
// - Plantilla asociada.
// - Estado de visibilidad.
// - Fecha de actualización.
//
// La imagen utiliza COALESCE para conservar
// la imagen anterior cuando no se envía una nueva.
//

const actualizar = (id, datos) => {

    return new Promise((resolve,reject)=>{


        console.log("Actualizando menú:", id, datos);



        db.run(

            `
            UPDATE menu
            SET
                nombre = ?,
                descripcion = ?,
                imagen = COALESCE(?, imagen),
                id_plantilla = ?,
                visible = ?,
                actualizado = datetime('now','-3 hours')
            WHERE id_menu = ?
            `,

            [

                datos.nombre,

                datos.descripcion,

                datos.imagen || null,

                datos.id_plantilla,

                datos.visible,

                id

            ],



            function(error){


                if(error){

                    console.error(error);

                    reject(error);

                }

                else{


                    console.log("Filas modificadas:", this.changes);

                    resolve();

                }

            }

        );

    });

};






// =======================================================
// ELIMINAR MENÚ
// =======================================================
//
// Elimina un menú utilizando su identificador.
//
// La validación de si puede eliminarse
// debe realizarse antes desde el controlador.
//
// Ejemplo:
// - No eliminar si posee fichas asociadas.
//

const eliminar = (id) => {


    return new Promise((resolve,reject)=>{


        db.run(
            `
            DELETE FROM menu
            WHERE id_menu = ?
            `,
            [id],

            function(error){


                if(error){

                    reject(error);

                }

                else{

                    resolve();

                }

            }

        );


    });


};






// =======================================================
// CREAR MENÚ
// =======================================================
//
// Inserta un nuevo menú en la base de datos.
//
// Recibe:
// - Nombre.
// - Descripción.
// - Imagen.
// - Plantilla asociada.
// - Estado de visibilidad.
//
// Retorna:
// ID generado del nuevo menú.
//

const crear = (datos)=>{

    return new Promise((resolve,reject)=>{


        const {

            nombre,

            descripcion,

            id_plantilla,

            visible,

            imagen

        } = datos;



        db.run(

            `
            INSERT INTO menu
            (
                nombre,
                descripcion,
                imagen,
                id_plantilla,
                visible,
                creado
            )

            VALUES (?, ?, ?, ?, ?, datetime('now','-3 hours'))

            `,

            [

                nombre,

                descripcion || null,

                imagen || null,

                id_plantilla || null,

                visible ?? 1

            ],


            function(error){


                if(error){

                    reject(error);

                }

                else{

                    resolve(this.lastID);

                }

            }

        );


    });

};






// =======================================================
// OBTENER MENÚ POR ID
// =======================================================
//
// Busca un menú específico utilizando su identificador.
//
// Recibe:
// - id del menú.
//
// Retorna:
// Información completa del menú.
//

const obtenerPorId = (id) => {

    return new Promise((resolve, reject) => {

        db.get(

            `
            SELECT *
            FROM menu
            WHERE id_menu = ?
            `,

            [id],

            (error, fila) => {


                if(error){

                    reject(error);

                }

                else{

                    resolve(fila);

                }

            }

        );

    });

};






// =======================================================
// CONTAR FICHAS ASOCIADAS A UN MENÚ
// =======================================================
//
// Cuenta cuántas fichas pertenecen a un menú.
//
// Se utiliza principalmente antes de eliminar
// un menú para evitar eliminar contenido relacionado.
//
// Retorna:
// Cantidad de fichas asociadas.
//

const contarFichas = (id_menu)=>{

    return new Promise((resolve,reject)=>{

        db.get(

            `
            SELECT COUNT(*) AS cantidad
            FROM ficha
            WHERE id_menu = ?
            `,

            [id_menu],

            (error,fila)=>{


                if(error){

                    reject(error);

                }

                else{

                    resolve(fila.cantidad);

                }

            }

        );

    });

};






// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar las funciones del modelo
// desde los controladores.
//

module.exports = {

    obtenerMenus,

    obtenerPorId,

    crear,

    actualizar,

    eliminar,

    contarFichas

};