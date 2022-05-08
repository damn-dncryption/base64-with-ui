const express = require("express");
const path = require("path");
const { json, urlencoded } = express;
var fs = require('fs');
const { FileIcon, FolderIcon } = require("./icons");

const app = express()
app.use(json({ limit: "50mb" }))
app.use(urlencoded({ extended: false, limit: "50mb" }))
app.set('view engine', 'ejs');
app.use("/assets", express.static(path.join(__dirname, "public")))
app.use("/pub", express.static(path.join(__dirname, "pub")))

app.get('/', (req, res) => {
	res.render("home")
})

const writeFile = (fileType, data) => {
	return new Promise((res, rej) => {
		fs.writeFile(`${fileType}/${Date.now()}.json`, JSON.stringify({ data: data.split(',')[1] }), (err) => {
			if (err) {
				return rej(err)
			} return res("saved")
		})
	})
}

const makeFolderIfNotExists = (pathName) => {
	if (!fs.existsSync(pathName)) {
		fs.mkdirSync(pathName);
	}
}

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
					return res.status(200).json({ data: "ok" })
				}).catch(err => {
					console.error(err);
					return res.status(500).json({ err })
				})
		}
		return res.status(200).json({ data: "ok" })
	} catch (err) {
		console.error(err);
		return res.status(500).json({ err })
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
	res.render("files", { data: fileList, basePath: bread, })

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


app.listen(9999, () => console.log('server started'))

