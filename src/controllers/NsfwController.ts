import {Controller, Post, Get} from 'simple-ts-express-decorators';
import multer, {memoryStorage} from 'multer';
import {Request, Response} from 'express';
import {NsfwImageClassifier} from 'app/NsfwImageClassifier';
import axios from 'axios';

const upload = multer({storage: memoryStorage()});

@Controller()
export class NsfwController {
  classifier: NsfwImageClassifier;

  constructor() {
    this.classifier = new NsfwImageClassifier();
  }

  @Post('/classify', upload.single('image'))
  async classify(request: Request, response: Response) {
    if (!request.file) {
      return response
        .status(410)
        .json({error: 'Specify image'});
    }

    const data = await this.classifier.classify(request.file.buffer);

    return response.json(data);
  }

  @Post('/classify-many', upload.array('images', 10))
  async classifyMany(request: Request, response: Response) {
    if (!request.files || !request.files.length) {
      return response
        .status(410)
        .json({error: 'Specify images'});
    }

    const buffers = (request.files as Express.Multer.File[]).map(file => file.buffer);
    const data = await this.classifier.classifyMany(buffers);

    return response.json(data);
  }

  @Get('/classify-url')
  async classifyUrl(request: Request, response: Response) {
    if (!request.query || typeof request.query.url !== 'string') {
      return response
        .status(410)
        .json({error: 'Specify url'});
    }

    try {
      const res = await axios.get(request.query.url, {
        headers: {
          referer: request.query.url,
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36'
        },
        timeout: 6000,
        responseType: 'arraybuffer',
        validateStatus: () => true
      });
      
      if (res.status < 200 || res.status >= 300) {
        return response
          .status(410)
          .json({error: res.statusText});
      }
  
      const data = await this.classifier.classify(res.data);
  
      return response.json(data);
    } catch(err) {
      return response
        .status(410)
        .json({error: String(err)});
    }
  }
}
