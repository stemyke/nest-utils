import { NestFactory } from '@nestjs/core';
import {
    INestApplication,
    Type,
    ValidationPipe,
    ValidationPipeOptions,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FixturesService } from './fixtures';

export interface BootstrapOptions {
    isWorker?: boolean;
    runFixtures?: boolean;
    name?: string;
    validation?: ValidationPipeOptions;
}

function makeOptions(src: BootstrapOptions): BootstrapOptions {
    src = src || {};
    src.isWorker = src.isWorker ?? false;
    src.runFixtures = src.runFixtures ?? false;
    src.name = src.name || 'Service';

    const validation = src.validation || {};
    validation.transform = validation.transform ?? true;
    validation.whitelist = validation.whitelist ?? true;
    const transform = validation.transformOptions || {};
    transform.enableImplicitConversion = transform.enableImplicitConversion ?? true;
    validation.transformOptions = transform;
    src.validation = validation;

    return src;
}

export async function bootstrap(
    moduleType: Type,
    options?: BootstrapOptions,
): Promise<INestApplication> {

    options = makeOptions(options);

    const app = await NestFactory.create(moduleType);

    // Ensure all endpoints are protected from invalid data
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
        new ValidationPipe(options.validation),
    );

    app.enableCors({
        origin: '*',
    });

    // Create swagger docs
    const config = new DocumentBuilder()
        .setTitle(options.name)
        .setDescription(`The Nest.js backend for ${options.name}`)
        // .setVersion('2.1.0')
        .addTag(options.name)
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger-ui', app, documentFactory, {
        jsonDocumentUrl: 'api-docs',
    });

    if (options.runFixtures) {
        try {
            const fixtures = await app.resolve(FixturesService);
            await fixtures?.load();
        } catch (e) {
            console.warn(`Failed to load fixture service. Skipping...`, e);
        }
    }

    // Listen
    await app.listen(process.env.PORT ?? 5000);

    return app;
}
