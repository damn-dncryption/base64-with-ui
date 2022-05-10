const express = require("express");
const path = require("path");
const {
	createClient
} = require('redis');
const dotenv = require("dotenv")
const {
	v4
} = require("uuid")
const {
	encryptString,
	decryptString
} = require('string-cipher');
dotenv.config()
const {
	json,
	urlencoded
} = express;
var fs = require('fs');
const {
	FileIcon,
	FolderIcon
} = require("./icons");

const app = express()
const client = createClient();

client.on('error', (err) => console.log('Redis Client Error', err));
client.connect().then(res => {
	console.log(res);
});


app.use(json({
	limit: "50mb"
}))
app.use(urlencoded({
	extended: false,
	limit: "50mb"
}))
app.set('view engine', 'ejs');


const writeFile = (fileType, data) => {
	return new Promise((res, rej) => {
		let daArr = data.split(',');
		fs.writeFile(`${fileType}/${Date.now()}.json`, JSON.stringify({
			data: daArr[1],
			enc: /image/.test(daArr[0] ? daArr[0] : "")
		}), (err) => {
			if (err) {
				return rej(err)
			}
			return res("saved")
		})
	})
}

const makeFolderIfNotExists = (pathName) => {
	if (!fs.existsSync(pathName)) {
		fs.mkdirSync(pathName);
	}
}

app.use("/assets", express.static(path.join(__dirname, "public")))

app.get("/login", (req, res) => {
	res.render("login")
})

app.post("/login", async (req, res) => {
	let body = req.body;
	const id = await decryptString(process.env.ID, process.env.SECRET);
	const code = await decryptString(process.env.CODE, process.env.SECRET);
	if (!(id == body.id && code == body.code)) {
		res.redirect("login")
	}
	let token = v4()
	await client.set(token, 'session');
	res.cookie("session", token, {
		maxAge: 60 * 60 * 1000,
		httpOnly: true,
		secure: true
	}).setHeader("set-cookie", "session=" + token).redirect("/");
})

const authGuard = (req, res, next) => {
	if (!!!req.headers.cookie) {
		res.redirect("/login")
		return
	}
	const cookies = req.headers.cookie.split(";");
	if (!!cookies.length) {
		if (!!cookies.find(e => e.includes("="))) {
			let token = cookies.filter((e) => e.split('=')[0] == "session");
			if (token) {
				let session = token.map(e => e.split('=')[1])
				if (!!session.length) {
					console.log(session);
					return client.get(session[0]).then(res => {
						if (!!res) {
							return next()
						}
					}).catch(err => {
						console.error(err);
						res.redirect("/login")
					})
				}
			}
		}
	}
	res.redirect("/login")
}

app.use(authGuard);


app.use("/pub", express.static(path.join(__dirname, "pub")))

app.get('/', (req, res) => {
	res.render("home")
})

app.post('/save', async (req, res) => {
	try {
		let body = req.body;
		console.log(body.folder, body.type);
		if (!!body.files) {
			let pathName = (f) => path.join(__dirname, `pub/${f}`)
			// if (!fs.existsSync(pathName(body.type))) {
			// 	fs.mkdirSync(pathName(body.type));
			// }
			makeFolderIfNotExists(pathName(body.type));
			let pathList = String(body.folder).split('/');
			console.log(pathList);
			let fPath = body.type;
			console.log(fPath);
			for (let i = 0; i < pathList.length; i++) {
				const e = pathList[i];
				if (i == 0) {
					fPath = pathName(`${body.type}/${e}`)
					makeFolderIfNotExists(fPath)
				} else {
					fPath = pathName(`${body.type}/${[...pathList].splice(0, i).join('/')}`)
					makeFolderIfNotExists(fPath)
				}
				console.log(fPath);
			}
			return await Promise.all(body.files.map(async (file) => await writeFile(fPath, file)))
				.then(_ => {
					return res.status(200).json({
						data: "ok"
					})
				}).catch(err => {
					console.error(err);
					return res.status(500).json({
						err
					})
				})
		}
		return res.status(200).json({
			data: "ok"
		})
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			err
		})
	}
})

app.get('/files', (req, res) => {
	let basePath = 'pub'
	let queryPath = req.query.path;
	if (!!queryPath) {
		basePath = queryPath;
	}
	let files = fs.readdirSync(basePath);
	let fileList = files.map((e) => {
		var name = `${basePath}/${e}`;
		const isDir = fs.statSync(name).isDirectory()
		return {
			name: e,
			path: name,
			isDir,
			icon: !isDir ? FileIcon : FolderIcon
		}
	}).sort((x, y) => y.isDir - x.isDir)
	console.log(fileList);
	let bread = [];
	let arrPath = basePath.split('/');
	arrPath.forEach((e, i) => {
		if (!bread.length) {
			bread.push({
				label: e,
				path: e
			})
		} else {
			bread.push({
				label: e,
				path: bread[i - 1].path + '/' + e
			})
		}
	})
	console.log(bread);
	res.render("files", {
		data: fileList,
		basePath: bread,
	})

})

app.post('/read', (req, res) => {
	const body = req.body;
	console.log(body);
	const fil = require(`./${body.path}`);
	console.log();
	if (/image/i.test(body.path)) {
		res.render("image", {
			enc: body.enc,
			data: fil.data
		})
		return
	}
	res.render("video", {
		enc: body.enc,
		data: fil.data
	})
})


app.post('/read/image', (req, res) => {
	let queryPath = req.query.path;

	let files = fs.readdirSync(basePath);
	res.render("image", {
		data: []
	})
	return
})


app.delete("/logout", async (req, res) => {
	res.cookie("session", "", {
		maxAge: 1,
		httpOnly: true,
		secure: true
	})
	let token = req.headers.cookie.split(';').find(e => e.includes("session")).split("=")[1];
	await client.del(token).catch(err => {
		console.error(err);
	})
	return res.redirect("/login")
})



app.listen(9999, () => console.log('server started'))