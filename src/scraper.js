const cheerio = require('cheerio');
const request = require('request-promise');
const path = require('path');
const logUp = require('log-update');
const url = require('url');
const download = require('download');

const { 
	saveJson, 
	readJson, 
	normalizeSpaces, 
	getAllFilesInDir 
} = require('./helpers/helpers');

const {
	isString,
	isNumber,
    isObject,
    isFunction,
    isArray
} = require('./helpers/type');

const initCache = (pathToFile, totalPages) => {
	let cache = readJson(pathToFile);

	if (!cache) {
		cache = {
			totalPages: (isNumber(totalPages) && totalPages > 0) ? totalPages : 100,
			next: 0,
			links: [],
			pages: []
		};

		global.CACHE_PAGES_IS_CHANGED = true;	
	} else {
		global.CACHE_PAGES_IS_CHANGED = false;
	}

	if (isNumber(totalPages) && cache.totalPages !== totalPages) {
		if (totalPages > 0) {
			if (cache.next + 1 > totalPages) {
				cache.next = 0;
			}

			cache.pages.length = totalPages;
			cache.links.length = totalPages;

			global.CACHE_PAGES_IS_CHANGED = true;
		}
	}


	global.CACHE_PAGES_PATH = pathToFile;
	global.CACHE_PAGES = cache;
}

const saveCache = () => {
	if (CACHE_PAGES_IS_CHANGED) {
		saveJson(CACHE_PAGES_PATH, CACHE_PAGES);
	}
}


const { log } = console;

const getPage = async (opts) => {
	let $ = '';

	if (CACHE_PAGES) {
		const link = (isString(opts)) ? opts : opts.uri;
		const pageIndex = CACHE_PAGES.links.indexOf(link);

		if (pageIndex !== -1) {
			$ = cheerio.load(CACHE_PAGES.pages[pageIndex], { decodeEntities: false });
		} else {
			try {
				$ = await request.get({
					jar: true,
					transform: (body) => cheerio.load(body, { decodeEntities: false }),
					...(isObject(opts) ? opts : { uri: opts })
				});
			} catch (e) {
				console.log(e);
			}

			if ($) {
				CACHE_PAGES.pages[CACHE_PAGES.next] = $.html();
				CACHE_PAGES.links[CACHE_PAGES.next] = link;
			
				CACHE_PAGES_IS_CHANGED = true;
				CACHE_PAGES.next = (CACHE_PAGES.next + 1 < CACHE_PAGES.totalPages) ? CACHE_PAGES.next + 1 : 0;
			}
		}
	}

	return $;
};

const getPageData = async (link, opts, attr) => {
	const $ = await getPage(link);
	let data = [];

	if (typeof opts === 'object') {
		const { elems, root } = opts;

		if (typeof elems === 'object') {
			if (typeof root === 'string') {
				$(root).each((i, r) => {
					const item = {};

					for (const el in elems) {
						const { selector, dataType, handler } = elems[el];
						let str = '';

						item[el] = [];

						$(r)
							.find(selector)
							.each((i, e) => {
								switch (dataType) {
									case undefined:
									case '':
									case 'text':
										str = $(e).text();
										break;
									case 'html':
										str = $(e).html();
										break;
									default:
										str = $(e).attr(dataType);
								}

								item[el].push(
									typeof handler === 'function' ? handler(str) : str
								);
							});

						if (item[el].length === 1) item[el] = item[el][0];
					}

					data.push(item);
				});
			} else {
				data = {};

				for (const el in elems) {
					const selector = el['selector'];
					const attr = el['attr'];
					const handler = el['handler'];

					data[el] = [];

					console.log($(selector).text());

					$(selector).each((i, e) => {
						const str =
							typeof attr === 'string' ? $(e).attr(attr) : $(e).text();

						data[el].push(typeof handler === 'function' ? handler(str) : str);
					});

					if (data[el].length === 1) data[el] = data[el][0];
				}
			}
		}
	} else if (typeof opts === 'string') {
		$(opts).each((i, el) => {
			if (attr) {
				if (attr === 'href' || attr === 'src') {
					data.push(new URL(url.resolve(link, $(el).attr(attr))).href);
				} else {
					data.push($(el).attr(attr));
				}
			} else {
				data.push($(el).text());
			}
		});
	}

	return data;
};

const handlePages = async (links, handlePage) => {
	const productsData = [];
	const numOfProducts = links.length;
	let productCounter = 0;

	logUp(`${productCounter}/${numOfProducts}`);

	for (const link of links) {
		try {
			const $ = await getPage(link);
			const data = handlePage($, link);

			if (data) {
				productsData.push(data);
			}

			logUp(`${++productCounter}/${numOfProducts}`);
		} catch (e) {
			logUp.done();
			console.log(e, link);
		}
		
	}

	logUp(`${productCounter}/${numOfProducts}`);
	logUp.done();

	return productsData;
}

const normailzeFileExt = (name, link) => {
	if (!isString(link)) return name;

	const nameTok = path.parse(name);
	const linkTok = path.parse(link);

	return (nameTok.ext) ?  nameTok.base : nameTok.name + linkTok.ext;
}

const downloadFiles = async (links, dist, itemHandler) => {
    const fLinks = [];

    let numOfLinks = links.length;
    let counter = 0;

    dist = dist || './';

    for (const link of links) {
        if (isString(link)) {
            fLinks.push({ filelink: link });
        } else if (isObject(link)) {
            if (isFunction(itemHandler)) {
                const data = itemHandler(link);

                if (isString(data)) {
                    fLinks.push({ filelink: data });
                } else if (isObject(data)) {
                    fLinks.push({
						...data,
						filename: normailzeFileExt(data.filename, data.filelink)
					});
                } else if (isArray(data)) {
                    --numOfLinks;
                    numOfLinks += data.length;

                    for (const fLink of data) {
                        if (isString(fLink)) {
                            fLinks.push({ filelink: fLink });
                        } else if (isObject(fLink)) {
                            fLinks.push({
								...fLink,
								filename: normailzeFileExt(fLink.filename, fLink.filelink)
							});
                        }
                    }
                }
            } else {
				fLinks.push({
					...link,
					filename: normailzeFileExt(link.filename, link.filelink)
				});
            }
        }
    }

	logUp(`${counter}/${numOfLinks}`)

	for (const fLink of fLinks) {
		const { filelink, filename } = fLink;

		try {
			await download(filelink, dist, { filename });
			
			logUp(`${++counter}/${numOfLinks}`)
		} catch (e) {
			logUp(e);
			logUp.done();
		}	
	}

	logUp.done();
}

module.exports = {
	initCache,
	saveCache,
    getPage,
    getPageData,
	handlePages,
	downloadFiles
}