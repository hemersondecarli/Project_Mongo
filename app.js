// app.js
const express = require('express');
const app = express();
const port = 3000;
const db = require('./db'); // Import the MySQL module
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');

// MongoDB URL
const mongoURI = 'mongodb://127.0.0.1:27017/proj2023?useNewUrlParser=true&useUnifiedTopology=true';


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// view engine config
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); // views directory


app.get('/', (req, res) => {
  // render views 'index.ejs'
  res.render('index');
});

//Stores
app.get('/stores', (req, res) => {
	db.query('SELECT * FROM store', (error, results) => {
    if (error) {
      console.error('Error when performing the query:', error);
      res.status(500).send('Internal Server Error');
    } else {
		//  render views 'index.ejs'
		res.render('stores',{ title: 'Stores', stores: results });
    }
  });
});


app.get('/addStore', (req, res) => {
	res.render('addStore', { title: 'Add Stores', error: null, store: "" });
});
  
app.post('/addStore', async (req, res) => {
	const sid = req.body.sid;
	const location = req.body.location;
	const mgrid = req.body.mgrid;
	const datas = req.body;
    var error = '';
	var storeCount = 0;
	
	const sql = 'SELECT * FROM store WHERE mgrid = ?';

	
	const client = new MongoClient(mongoURI)
			
	try {
		// Connect to the MongoDB cluster
		await client.connect();

		// Access database and collection
		const database = client.db('proj2023');
		const collection = database.collection('proj2023');

		// Verify the existence of the document by ID
		const result = await  collection.findOne({ _id: mgrid });
		// Respond based on whether the document exists or not
		if (!result) {				
			// the ID doesnt exist
			error = 'Manager ' + mgrid + ' Doesn`t exist in MongoD';
			return res.render('addStore', { title: 'Add Stores', error,  store: datas });	
		}else{
			const result1 = await executeQuery(sql, mgrid);
			if (result1.length > 0) {
				// the ID already exists, 
				error = 'Manager ' + mgrid + ' already managaing another store';
				return res.render('addStore', { title: 'Add Stores', error,  store: datas });	
			} else {

				//Check if the store exist
				const checkStoreQuery = 'SELECT * FROM store WHERE sid = ?';

				db.query(checkStoreQuery, [sid], (err, result) => {
					if (err) {
						res.status(500).send('Internal Server Error');
						return;
					}
					storeCount =  result.length;

					if (storeCount == 0) {
						//Insert Store
						const insertQuery = 'INSERT INTO store values (?, ?, ?)';
				
						db.query(insertQuery, [sid, location, mgrid], (err, results) => {
				
							if (err) {
								res.status(500).send('Internal Server Error');
								return;
							}else{
								res.redirect('/stores');
							}
						});
					} else {
						// Store exist
						error = 'The Store ' + sid + ' exist ';
						return res.render('addStore', { title: 'Add Stores', error,  store: datas });	
					}
				});

			}
		}
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).send('Internal server ERROR');
	}
	
});


//Stores Edit
app.get('/stores/edit/:sid', (req, res) => {
	const sid = req.params.sid;
	
	
	const sql = 'SELECT * FROM store WHERE sid = ?';
	 // Query
	db.query(sql, [sid], (error, result) => {
    if (error) {
      console.error('Error when performing the query:', error);
      res.status(500).send('Internal server ERROR');
    } else {
		// render views 'stores.ejs'
		res.render('storesEdit',{ error,title: 'Edit Stores', store: result[0] });
    }
  });
});


//Stores Update
app.post('/stores/edit/:sid', async (req, res) => {
	const sid = req.params.sid;
	const { location, mgrid} = req.body;
	const datas = req.body;
	var error = '';
	// Query db
	const sql = 'SELECT * FROM store WHERE mgrid = ?';
	const sql2 = 'UPDATE store SET mgrid = ? WHERE sid = ?';
	
	if(location.length < 1){
		error = 'Location must be at least 1 character';	
	}
    else if (!/^[A-Za-z0-9]{4}$/.test(mgrid)) { // Check if Manager ID is 4 characters
		error = 'Manager ID should be 4 alphanumeric characters';
    }else{
		
	
		const result1 = await executeQuery(sql, mgrid);
		if (result1.length > 0) {
		 // the ID already exist
			error = 'Manager ' + mgrid + ' already managaing another store';
		} else {

			const client = new MongoClient(mongoURI)
			
			try {
			// Connect to the MongoDB cluster
			await client.connect();
			
			// Access your database and collection
			const database = client.db('proj2023');
			const collection = database.collection('proj2023');

			// Verify the existence of the document by ID
			const result = await  collection.findOne({ _id: mgrid });
			// Respond based on whether the document exists or not
			if (!result) {				
				// ID doesnt exist
				error = 'Manager ' + mgrid + ' Doesn`t exist in MongoD';
			}else{
				const result1 = await executeUpdateQuery(sql2, mgrid, sid);
				if (!result1)	
					error = 'Wrong System';
					
			}
				
			} catch (err) {
				console.error('Error connecting to the database:', err);
				res.status(500).send('Internal Server Error');
			}
		}
	}
	
	
	
	if(error != ''){
		res.render('storesEdit', { error , title: 'Edit Stores', store: datas });
	}else{
		res.redirect('/stores');
	}
});

//Products
app.get('/products', (req, res) => {
	 // query db
	 const query = `
    SELECT 
      product.*, store.*, product_store.price
    FROM 
      product_store
    RIGHT JOIN 
      product ON product_store.pid = product.pid
    LEFT JOIN 
      store ON product_store.sid = store.sid
  `;
	db.query(query, (error, results) => {
    if (error) {
      console.error('Error when performing the query', error);
      res.status(500).send('Internal ');
    } else {
		// Render views 'products.ejs'
		res.render('products',{ title: 'Products', products: results });
    }
  });
});


// GET route to delete a product
app.get('/products/delete/:pid', (req, res) => {
  const productId = req.params.pid;

  // Check if the product is associated with any store
  const checkProductStoreQuery = 'SELECT COUNT(*) AS count FROM product_store WHERE pid = ?';

    db.query(checkProductStoreQuery, [productId], (err, result) => {
    if (err) {
      console.error('Error checking for associated records:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const associatedRecordsCount = result[0].count;

    if (associatedRecordsCount === 0) {
      // No associated records, proceed with deletion
      const deleteProductQuery = 'DELETE FROM product WHERE pid = ?';

        db.query(deleteProductQuery, [productId], (err, results) => {
        if (err) {
          console.error('Error executing DELETE query:', err);
          res.status(500).send('Internal Server Error');
          return;
        }

        if (results.affectedRows > 0) {
          // Product deleted successfully, redirect to the products page
          res.redirect('/products');
        } else {
          // No matching product found
          res.status(404).send('Product not found');
        }
      });
    } else {
      // Product is associated with at least one store, display an error or redirect to a failure view
	  const error = productId + ' is currently in stores and cannot be deleted';
      res.render('errorproduct',{ title: 'Error Message', error });
    }
  });
});




// Route to fetch all documents and render them in a view
app.get('/managers', async (req, res) => {
	
	const client = new MongoClient(mongoURI)
	
	try {
	// Connect to the MongoDB cluster
	await client.connect();
	
	// Access your database and collection
	const database = client.db('proj2023');
	const collection = database.collection('proj2023');

	// Verify the existence of the document by ID
	const results = await collection.find().toArray();
	// Render the documents in a view
    res.render('managers', {title: 'Managers (MongoDB)', results });
		
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).send('Internal server Error');
	}
});

//GET managers add 
app.get('/managers/add', (req, res) => {
	const error = '';
	res.render('managersAdd',{ title: 'Add Manager', error,  manager: '' });
});

//POST managers add 
app.post('/managers/add', async (req, res) => {
	const { id, name, salary} = req.body;
	const datas = req.body;
	var error = '';
	
	if(id.length != 4){ // Check if Manager ID is 4 characters
		error = 'Manager ID must be 4 characters';	
	}
    else if (name.length <= 5) {  // Check if Name must be > 5 characters.
		error = 'Name must be > 5 characters';
    }else if (isNaN(parseFloat(salary)) || parseFloat(salary) < 30000 || parseFloat(salary) > 70000){	
		error = 'Salary must be between 30000 and 70000';	
	}else{
		// connect to db
		const client = new MongoClient(mongoURI)
		try {
		await client.connect();

		// Access your database and collection
		const database = client.db('proj2023');
		const collection = database.collection('proj2023');

		// Verify if a document with the same ID already exists
		const existDocument = await collection.findOne({ _id: id});

		if (existDocument) {
			error = 'Error: Manager ' + id + ' already exists in MongoDB';
		}else{
			// if the id is unique, insert new doc
			await collection.insertOne({
			  _id: id,
			  name: name,
			  salary: salary,
			  
			});
		}
	  } catch (error) {
		console.error('Error:', error);
		res.status(500).json({ mensaje: 'Internal server Error' });
	  } finally {
		// closing db connection
		await client.close();
	  }
	}
	
	
	
	if(error != ''){
		res.render('managersAdd',{ title: 'Add Manager', error, manager:datas });
	}else{
		res.redirect('/managers');
	}
});


function executeQuery(query, mgrid) {
  return new Promise((resolve, reject) => {
    db.query(query, [mgrid], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

function executeUpdateQuery(query, mgrid, sid) {
  return new Promise((resolve, reject) => {
    db.query(query, [mgrid, sid], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}



// Start Server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
