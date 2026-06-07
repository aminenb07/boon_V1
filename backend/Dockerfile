FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libonig-dev \
        libpq-dev \
        libzip-dev \
    && docker-php-ext-install \
        bcmath \
        mbstring \
        pdo_mysql \
        pdo_pgsql \
        zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php-production.ini /usr/local/etc/php/conf.d/zz-boon-production.ini

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader

COPY . .

RUN composer dump-autoload --optimize \
    && sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf /etc/apache2/apache2.conf \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rw storage bootstrap/cache

CMD sed -i "s/Listen 80/Listen ${PORT:-10000}/" /etc/apache2/ports.conf \
    && sed -i "s/:80>/:${PORT:-10000}>/" /etc/apache2/sites-available/000-default.conf \
    && php artisan config:clear \
    && php artisan migrate --force \
    && php artisan config:cache \
    && apache2-foreground
