/* global loader */

function createImgCanvas(img) {
	const canvas = document.createElement('canvas');
	const { width, height } = img;
	canvas.width = width;
	canvas.height = height;
	document.body.appendChild(canvas);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0);
	return { canvas, ctx };
}


function createMask(imgData) {
	const { data, width, height } = imgData;
	const mask_u8 = new Int32Array(width * height);
	for (let i = 0; i < data.length / 4; i++) {
		const Y = (
			.299 * data[4 * i] +
			.587 * data[4 * i + 1] +
			.114 * data[4 * i + 2]
		);
		if (Y > 230) {
			const rad = 6;
			for (let dx = -rad; dx <= rad; dx++) {
				for (let dy = -rad; dy <= rad; dy++) {
					if (dx * dx + dy * dy <= rad * rad) {
						mask_u8[i + dx + dy * width] = 1;
					}
				}
			}
		}
	}
	return mask_u8;
}


const logError = (_msg, _file, line, column) => {
	console.error(`Error at ${line}:${column}`);
};


// eslint-disable-next-line no-unused-vars
function main() {
	const img = new Image();
	img.onload = () => {
		document.body.appendChild(img);
		const { ctx } = createImgCanvas(img);
		const { width, height } = img;

		loader
			.instantiateStreaming(
				// fetch('/build/untouched.wasm'),
				fetch('/build/optimized.wasm'),
				{
					env: { abort: logError }
				}
			)
			.then((instance) => {
				const {
					inpaint,
					Int32Array_ID,
					__newArray,
					__getInt32ArrayView,
					__pin,
					__unpin,
					__collect,
				} = instance.exports;
				// console.log(instance.exports);

				const imgData = ctx.getImageData(0, 0, width, height);
				const mask = createMask(imgData);

				const start = Date.now();
				const maskPtr = __pin(__newArray(Int32Array_ID, mask));
				const imgPtr = __pin(__newArray(Int32Array_ID, imgData.data));

				inpaint(width, height, imgPtr, maskPtr);

				const imgView = __getInt32ArrayView(imgPtr);

				const dur = (Date.now() - start) / 1000;
				console.log(`${dur} seconds`);

				imgData.data.set(imgView);
				ctx.putImageData(imgData, 0, 0);

				__unpin(imgPtr);
				__unpin(maskPtr);
				__collect();
			});
	};
	img.src = 'skid.jpg';
}
