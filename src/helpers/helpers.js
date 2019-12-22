const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const {
    isRegExp
} = require('./type');

const readJson = (pathToFile) => (fs.existsSync(pathToFile)) ? JSON.parse(fs.readFileSync(pathToFile)) : null;
const saveJson = (pathToFile, data) => {fs.writeFileSync(pathToFile, JSON.stringify(data, null, '\t'))};
const normalizeSpaces = (str) => str.replace(/\n/g, ' ').replace(/^\s+|\s(?=\s)|\s+$/g, '');

const getAllFilesInDir = (dir) => {
	if (fs.statSync(dir).isDirectory()) {
		return fs.readdirSync(dir).reduce((acc, name) => {
			return [...acc, ...getAllFilesInDir(path.join(dir, name))];
		}, []);
	}
	return [dir];
};

const getListOfFiles = (dir, replaceRE) => {
    return fs.readdirSync(dir).reduce((acc, file) => {
		let name = (isRegExp(replaceRE)) ? path.parse(file).name.replace(replaceRE, '') : path.parse(file).name;

        return {
            ...acc,
            ...(fs.statSync(`${dir}\\${file}`).isDirectory())
            ? getListOfFiles(`${dir}\\${file}`)
            : ( 
                (name in acc) 
                ? ((Array.isArray(acc[name])) ? {[name]: acc[name].concat(file)} : {[name]: [acc[name], file]})
                : {[name]: file}
            ),
        };
    }, {});
};

const arrToXlsx = (data, dist) => {
	let wb,
		ws;

	if (data.length) {
		dist = (fs.statSync(dist).isDirectory()) ? path.resolve(dist, 'out.xlsx') : './out.xlsx';

		wb = xlsx.utils.book_new();
		ws = xlsx.utils.aoa_to_sheet(data);

		xlsx.utils.book_append_sheet(wb, ws);
		xlsx.writeFile(wb, dist);
	}
}

module.exports = {
    readJson,
	saveJson,
	normalizeSpaces,
	getListOfFiles,
	arrToXlsx
}