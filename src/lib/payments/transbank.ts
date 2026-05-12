import { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from 'transbank-sdk';

/**
 * Transbank Configuration
 * 
 * In integration environment, we use public test keys.
 * In production, you must set TRANSBANK_COMMERCE_CODE and TRANSBANK_API_KEY.
 */

const commerceCode = process.env.TRANSBANK_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;
const apiKey = process.env.TRANSBANK_API_KEY || IntegrationApiKeys.WEBPAY;
const environment = process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Integration;

const options = new Options(commerceCode, apiKey, environment);

export const tx = new WebpayPlus.Transaction(options);
