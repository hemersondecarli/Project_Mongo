// db.js
const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'proj2023',
});

connection.connect((error) => {
  if (error) {
    console.error('Error al conectar a MySQL:', error);
  } else {
    console.log('Successful connection to MySQL');
  }
});

module.exports = connection;