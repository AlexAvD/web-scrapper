const isObject = (data) => ( !!data ) && ( Object.prototype.toString.call(data) === '[object Object]' );
const isArray  = (data) => Array.isArray(data);
const isString = (data) => typeof data === 'string';
const isNumber = (data) => typeof data === 'number' && !isNaN(data);
const isFunction = (data) => typeof data === 'function';
const isUndefined = (data) => data === undefined;
const isNull = (data) => typeof data === null;
const isRegExp = (data) => Object.prototype.toString.call(data) === '[object RegExp]';

module.exports = {
    isObject,
    isArray,
    isString,
    isNumber,
    isFunction,
    isUndefined,
    isNull,
    isRegExp
};