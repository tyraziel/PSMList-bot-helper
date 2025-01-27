/*
 *
 * Discord bot - PSMList helper
 *
 * Authors : DodoDye and Arshellan
 *
 */

const express = require('express'),
      app = express(),
      mysql = require('mysql'),
      dbConfig = require('./secret').db;

const pool = mysql.createPool({
    connectionLimit : 20,
	port : 3306,
	...dbConfig,
});

pool.getConnection( err => {
    if (err) {
    	console.log('Unable to connect to database!');
    	throw err;
	}
    else {
		console.log('Database is connected!');
	}
});

function poolQuery(query, args){
	return new Promise((resolve, reject) => {
		pool.query(query, args, (err, results, fields) => {
			if (!err) {
				resolve(results, fields);
			}
			else {
				reject(err);
			}
		});
	});
}

let extensions, extensionShorts, extensionsRegex;
require('./utils').loadData('extension').then( imports => {
	extensions = imports.extensions;
    extensionShorts = Object.values(extensions).map((ext) => ext.short);
	extensionsRegex = '(' + extensionShorts.reduce((accu, ext, index) => accu + ext + (index < extensionShorts.length - 1 ? '|' : ''), '') + ')';
});

const api = express.Router();
app.use('/api', api);

const ship = express.Router();
api.use('/ship', ship);

const fort = express.Router();
api.use('/fort', fort);

const crew = express.Router();
api.use('/crew', crew);

ship.get('/', (req, res) => {
    res.json({error: 'Not implemented yet!'});
});

ship.get('/id/:ship', (req, res) => {
	const shipID = req.params.ship.substring(0, 10).toUpperCase();

	const parts = shipID.match('(' + extensionsRegex + '((?:UL)?-?)(\\d+))|(.+)');

	if ( parts[0].length === 0 || parts[0].length !== req.params.ship.length) {
		return res.json([]);
	}

	if ( !parts[5] ) {
		let   numID = parts[4],
			  extensionShort = parts[2];
		const particle = parts[3];

		if (particle !== '') {
			if ( particle === '-' && ['SS', 'PS', 'ES'].indexOf(extensionShort) > -1 ) {
				numID = extensionShort + '-' + parts[4];
				extensionShort = 'SM';
			}
			else if (particle.startsWith('UL')) {
				if (particle.endsWith('-')) {
					numID = 'UL-' + parts[4];
				}
				else {
					numID = 'UL' + parts[4];
				}
			}
		}

		poolQuery("SELECT * FROM ship WHERE isFort = 0 AND numId REGEXP ? AND idExtension = (SELECT idExtension FROM extension WHERE short = ?);", ['^0*' + numID + 'a?$', extensionShort])
		.then( results => {
			res.json(results);
		})
		.catch( err => {
			// error will be an Error if one occurred during the query
			console.log(err);
			res.json({error: err});
		});
	}
	else {
		const numID = parts[5];
		poolQuery("SELECT * FROM ship WHERE isFort = 0 AND numId REGEXP ?;", '^0*' + numID + 'a?$')
		.then( results => {
			res.json(results);
		})
		.catch( err => {
			console.log(err);
			res.json({error: err});
		});
	}
});

ship.get('/name/:ship', (req, res) => {
	const shipName = req.params.ship.substring(0, 30).toUpperCase();

	if ( shipName.length === 0 || shipName.length !== req.params.ship.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM ship WHERE isFort = 0 AND name REGEXP ?;", shipName)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.log(err);
		res.json({error: err});
	});
});

fort.get('/', (req, res) => {
	res.json({error: 'Not implemented yet!'});
});

fort.get('/id/:fort', (req, res) => {
	const fortID = req.params.fort.substring(0, 10).toUpperCase();

	const parts = fortID.match('(' + extensionsRegex + '(.+))|(.+)');

	if ( parts[0].length === 0 || parts[0].length !== req.params.fort.length) {
		return res.json([]);
	}

	if ( !parts[5] ) {
		const numID = parts[3],
			extensionShort = parts[2];

		poolQuery("SELECT * FROM ship WHERE isFort = 1 AND numId REGEXP ? AND idExtension = (SELECT idExtension FROM extension WHERE short = ?);", ['^0*' + numID + '$', extensionShort])
		.then( results => {
			res.json(results);
		})
		.catch( err => {
			console.log(err);
			res.json({error: err});
		});
	}
	else {
		const numID = parts[5];
		poolQuery("SELECT * FROM ship WHERE isFort = 1 AND numId REGEXP ?;", '^0*' + numID + '.?$')
		.then( results => {
			res.json(results);
		})
		.catch( err => {
			console.log(err);
			res.json({error: err});
		});
	}
});

fort.get('/name/:fort', (req, res) => {
	const fortName = req.params.fort.substring(0, 30).toUpperCase();

	if ( fortName.length === 0 || fortName.length !== req.params.fort.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM ship WHERE isFort = 1 AND name REGEXP ?;", fortName)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.log(err);
		res.json({error: err});
	});
});

crew.get('/', (req, res) => {
	res.json({error: 'Not implemented yet!'});
});

crew.get('/id/:crew', (req, res) => {
	const crewID = req.params.crew.substring(0, 10).toUpperCase();

	const parts = crewID.match('(' + extensionsRegex + '(-?)(.+))|(.+)');

	if ( parts[0].length === 0 || parts[0].length !== req.params.crew.length) {
		return res.json([]);
	}

	if ( !parts[5] ) {
		let numID = parts[4],
			extensionShort = parts[2];

		if (parts[3] === '-' && extensionShort.test('(SS|PS|ES|GS|PP)')) {
			extensionShort = 'SM';
		}

		poolQuery("SELECT * FROM crew WHERE numId REGEXP ? AND idExtension = (SELECT idExtension FROM extension WHERE short = ?);", ['^0*' + numID + '[a-zA-Z]?$', extensionShort])
		.then( results => {
			res.json(results);
		})
		.catch( err => {
			console.log(err);
			res.json({error: err});
		});
	}
	else {
		const numID = parts[5];
		poolQuery("SELECT * FROM crew WHERE numId REGEXP ?;", '^0*' + numID + '[a-zA-Z]?$')
		.then( results => {
			res.json(results);
		})
		.catch( err => {
			console.log(err);
			res.json({error: err});
		});
	}
});

crew.get('/name/:crew', (req, res) => {
	const crewName = req.params.crew.substring(0, 30).toUpperCase();

	if ( crewName.length === 0 || crewName.length !== req.params.crew.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM crew WHERE name REGEXP ?;", crewName)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.log(err);
		res.json({error: err});
	});
});

api.get('/faction', (req, res) => {
    poolQuery("SELECT idFaction, nameImg FROM faction;")
    .then( results => {
		res.json(results);
	})
	.catch( err => {
		console.log(err);
		res.json({error: err});
	});
});

api.get('/extension', (req, res) => {
    poolQuery("SELECT idExtension, name, short FROM extension;")
    .then( results => {
		res.json(results);
	})
    .catch( err => {
		console.log(err);
		res.json({error: err});
	});
});

api.get('/rarity', (req, res) => {
    poolQuery("SELECT idRarity, colorHex, nameLocale FROM rarity;")
    .then( results => {
		res.json(results);
	})
    .catch( err => {
		console.log(err);
		res.json({error: err});
	});
});

api.get('*', (req, res) => {
	res.json({});
});

app.listen(8080, () => {
    console.log('API is running on port 8080');
});

process.on('exit', () => pool.end( err => {
    // all connections in the pool have ended
	console.log(err);
}));

