//load express, handlebars, mysql2
const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise') //get the driver with promise support

//SQL
const SQL_FIND_BY_NAME = 'select * from apps where name like ? limit ?' //don't use string concatenation for SQL statements. Use ? as placeholder
//no need ; since it is understood as single statement. Use ; when typing multiple statements, and this has to be enabled in createPool.
//configure PORT
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

//create the database connection pool
const pool = mysql.createPool({ //createPool takes an object
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'playstore',
    user: process.env.DB_USER,   //do not include a default user for privacy as this will be uploaded to GitHub
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 4,
    timezone: '+08:00',
    // multipleStatements: true    //to enable multiple statements
    //minimally, need to set user and password to run the function
})

const startApp = async (app, pool) => { //set a guard such that application starts only when DB connection is established
    try {
        //acquire a connection from the connection pool
        const conn = await pool.getConnection()

        console.info('Pinging database...')
        await conn.ping()   //ping the database

        //release the connection
        conn.release()

        //start application server
        app.listen(PORT, () => {
            console.info(`Application started at port ${PORT} on ${new Date()}`)
        })

    } catch(e) {
        console.error('Cannot ping database: ', e)
    }
}

//create an instance of express
const app = express()

//configure handlebars
app.engine('hbs', handlebars({defaultLayout: 'default.hbs'}))
app.set('view engine', 'hbs')

//configure the application
app.get('/', 
    (req, resp) => {
        resp.status(200)
        resp.type('text/html')
        resp.render('index')
    }
)

app.get('/search', 
    async (req, resp) => {
        const q = req.query['q'];
        
        //acquire connection from the pool
        const conn = await pool.getConnection()

        try {
            //perform the query
            // SQL_FIND_BY_NAME = 'select * from apps where name like ? limit ?'
            // const result = await conn.query(SQL_FIND_BY_NAME, [`%${q}%`, 10])    //concatenation is to the values, not the SQL string so it's okay
            // const recs = result[0]  //result will have an array of two elements. [0] is the search results, [1] is the meta data
            const [recs, _] = await conn.query(SQL_FIND_BY_NAME, [`%${q}%`, 10])
            console.info('recs = ', recs)
            resp.status(200)
            resp.type('text/html')
            resp.render('result', {recs, q})
        } catch(e) {

        } finally {
            //release connection
            conn.release()
        }
    }
)

startApp(app, pool)