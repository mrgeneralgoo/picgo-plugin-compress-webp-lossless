import { IPicGo, IPluginConfig, IPicGoPlugin } from 'picgo';
import { TinypngCompress } from './compress/tinypngweb.js';
import { TinypngKeyCompress } from './compress/tinypng/index.js';
import { ImageminCompress } from './compress/imagemin.js';
import { Image2WebPCompress } from './compress/image2webp.js';
import { CompressType } from './config.js';
import { getUrlInfo } from './utils.js';
import { IConfig } from './interface.js';
import { SkipCompress } from './compress/skip.js';

// Allowed image file extensions
const ALLOW_EXTNAME = ['.png', '.jpg', '.webp', '.jpeg'];

// Compression handler function
const handle = async (ctx: IPicGo): Promise<IPicGo> => {
  // Get compression configuration
  const config: IConfig = ctx.getConfig('transformer.compress') || ctx.getConfig('picgo-plugin-compress-webp-lossless');
  const compress = config?.compress;
  const key = config?.key || config?.tinypngKey;

  // Log compression setting
  ctx.log.info('Compression type: ' + compress);

  // Process images
  const tasks = ctx.input.map((imageUrl) => {
    // Log image URL
    ctx.log.info('Image URL: ' + imageUrl);
    const info = getUrlInfo(imageUrl);
    // Log image information
    ctx.log.info('Image info: ' + JSON.stringify(info));
    if (ALLOW_EXTNAME.includes(info.extname.toLowerCase())) {
      switch (compress) {
        case CompressType.tinypng:
          return key ? TinypngKeyCompress(ctx, { imageUrl, key }) : TinypngCompress(ctx, { imageUrl });
        case CompressType.imagemin:
          return ImageminCompress(ctx, { imageUrl });
        case CompressType.image2webp:
          return Image2WebPCompress(ctx, { imageUrl });
        default:
          return key ? TinypngKeyCompress(ctx, { imageUrl, key }) : TinypngCompress(ctx, { imageUrl });
      }
    }
    // Log unsupported format warning
    ctx.log.warn('Unsupported image format. Skipping compression.');
    return SkipCompress(ctx, { imageUrl });
  });

  return Promise.all(tasks).then((output) => {
    // Log compressed image information
    ctx.log.info('Compressed image info: ' + JSON.stringify(output.map((item) => ({
      fileName: item.fileName,
      extname: item.extname,
      height: item.height,
      width: item.width
    }))));

    // Set output images
    ctx.output = output;
    return ctx;
  });
};

// Export plugin function
const CompresseTransformers: IPicGoPlugin = () => {
  return {
    transformer: 'compress',
    register(ctx: IPicGo) {
      // Register compression transformer
      ctx.helper.transformer.register('compress', { handle });
    },
    config(ctx: IPicGo): IPluginConfig[] {
      let config: IConfig = ctx.getConfig('transformer.compress') || ctx.getConfig('picgo-plugin-compress-webp-lossless');

      return [
        {
          name: 'compress',
          type: 'list',
          message: 'Choose compression library',
          choices: Object.keys(CompressType),
          default: config?.compress || CompressType.tinypng,
          required: true,
        },
        {
          name: 'key',
          type: 'input',
          message: 'Enter API key(s). Leave blank to use Web API. Separate multiple keys with commas.',
          default: config?.key || config?.tinypngKey || null,
          required: false,
        },
      ];
    },
  };
};

export default CompresseTransformers