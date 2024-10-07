import createApp from '../src/app'; // Importa tu aplicación
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

let app: AppController;
let service: AppService

beforeAll(async () => {
    service = new AppService()
    app = new AppController(service); // Crea la aplicación antes de ejecutar las pruebas
});

describe('GET /', () => {
    test('Test should return Hello World', async () => {
        let result;
        jest.spyOn(service, 'getHello').mockImplementation(() => result);
        console.log(await app.getHello())
        console.log(process.env.DATABASE_URL)
        expect(await app.getHello()).toBe(result);
    });
});
