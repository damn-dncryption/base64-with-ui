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
		fs.writeFile(path.join(__dirname, `pub/${fileType}/${Date.now()}.json`), JSON.stringify({ data: data.split(',')[1] }), (err) => {
			if (err) {
				return rej(err)
			} return res("saved")
		})
	})
}

app.post('/save', async (req, res) => {
	try {
		let body = req.body;
		if (!!body.files) {
			let pathName = path.join(__dirname, `pub/${body.type}`)
			if (!fs.existsSync(pathName)) {
				fs.mkdirSync(pathName);
			}
			return await Promise.all(body.files.map(async (file) => await writeFile(body.type, file)))
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
	res.render("video", {
		enc: body.enc,
		data: fil.data
	})
})


app.listen(3000, () => console.log('server started'))

