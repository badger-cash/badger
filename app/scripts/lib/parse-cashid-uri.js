// Originally from Jonathan Silverblood's CashID demo repo: https://gitlab.com/cashid/demos

module.exports = parseCashIDRequest

function parseCashIDRequest(requestURI)
{
	// Regular expressions from the specification to simplify parsing.
	let regnames =
	{
		request:
		{
			scheme: 1,
			domain: 2,
			path: 3,
			parameters: 4
		},
		parameters:
		{
			action: 1,
			data: 2,
			required: 3,
			optional: 4,
			nonce: 5
		},
		metadata:
		{
			identification: 1,
			name: 2,
			family: 3,
			nickname: 4,
			age: 5,
			gender: 6,
			birthdate: 7,
			picture: 8,
			national: 9,
			position: 10,
			country: 11,
			state: 12,
			city: 13,
			street: 14,
			residence: 15,
			coordinate: 16,
			contact: 17,
			email: 18,
			instant: 19,
			social: 20,
			phone: 21,
			postal: 22
		}
	}
	let regexps =
	{
		'request': /(cashid:)(?:[\/]{2})?([^\/]+)(\/[^\?]+)(\?.+)/,
		'parameters': /(?:(?:[\?\&]{1}a=)([^\&]+))?(?:(?:[\?\&]{1}d=)([^\&]+))?(?:(?:[\?\&]{1}r=)([^\&]+))?(?:(?:[\?\&]{1}o=))?([^\&]+)?(?:[\?\&]{1}x=)([^\&]+)?/,
		'metadata': /(?:i((?![1-9]+))?(1)?(2)?(3)?(4)?(5)?(6)?(8)?(9)?)?(?:p((?![1-9]+))?(1)?(2)?(3)?(4)?(6)?(9)?)?(?:c((?![1-9]+))?(1)?(2)?(3)?(4)?(7)?)?/
	}

	let requestParts = regexps.request.exec(requestURI);

	if (requestParts == null) {
		return
	}

	let requestParameters = regexps.parameters.exec(requestParts[regnames['request']['parameters']]);
	let requestRequired = regexps.metadata.exec(requestParameters[regnames['parameters']['required']]);
	let requestOptional = regexps.metadata.exec(requestParameters[regnames['parameters']['optional']]);

	let requestNamedParts = {};
	for(let name in regnames['request'])
	{
		requestNamedParts[name] = requestParts[regnames['request'][name]];
	}

	requestNamedParts.parameters = {};
	for(let name in regnames['parameters'])
	{
		requestNamedParts.parameters[name] = requestParameters[regnames['parameters'][name]];
	}

	if(requestNamedParts.parameters['required'])
	{
		requestNamedParts.parameters.required = {};
		for(let name in regnames['metadata'])
		{
			requestNamedParts.parameters.required[name] = requestRequired[regnames['metadata'][name]];
		}
	}

	if(requestNamedParts.parameters['optional'])
	{
		requestNamedParts.parameters.optional = {};
		for(let name in regnames['metadata'])
		{
			requestNamedParts.parameters.optional[name] = requestOptional[regnames['metadata'][name]];
		}
	}

	return requestNamedParts;
}
