// Apify SDK
import { Actor, log } from 'apify';
import axios from 'axios';

await Actor.init();

interface Input {
    limit?: number;
    maxPages?: number;
}

const input = await Actor.getInput<Input>() ?? {};
const limit = input.limit ?? 15;
const maxPages = input.maxPages ?? 5;

const BASE_URL = 'https://wooniezie-aanbodapi.zig365.nl/api/v1/actueel-aanbod';

log.info('Starting Zig365 aanbod fetch', { limit, maxPages });

let page = 0;
let totalPages = 1;
let totalRecords = 0;
let recordsWithMissingData = 0;

while (page < totalPages && page < maxPages) {
    const url = `${BASE_URL}?limit=${limit}&locale=nl_NL&page=${page}&sort=%2BreactionData.aangepasteTotaleHuurprijs`;

    log.info(`Fetching page ${page + 1}/${totalPages}`, { url });

    try {
        const response = await axios.get(url, {
            headers: {
                accept: 'application/json',
            },
            timeout: 30000,
        });

        const { data, _metadata } = response.data;

        totalPages = _metadata.page_count;

        log.info('API response metadata', {
            page: _metadata.page,
            pageCount: _metadata.page_count,
            itemsOnPage: data.length,
            totalItems: _metadata.total_count,
        });

        for (const item of data) {
            const record = {
                id: item.id,
                urlKey: item.urlKey,
                straat: item.street,
                huisnummer: `${item.houseNumber ?? ''}${item.houseNumberAddition ?? ''}`,
                postcode: item.postalcode,
                stad: item.city?.name,
                verhuurder: item.corporation?.name,
                type: item.dwellingType?.localizedName,
                huur: item.totalRent,
                beschikbaarVanaf: item.availableFromDate,
                publicatieDatum: item.publicationDate,
                sluitingsDatum: item.closingDate,
                reacties: item.numberOfReactions,
                kanReageren: item.reactionData?.kanReageren,
                huurtoeslag: item.huurLigtOpOfOnderHuurtoeslaggrens,
                lat: item.latitude,
                lon: item.longitude,
            };

            // Track records with missing optional data
            const missingFields = [];
            if (!record.stad) missingFields.push('stad');
            if (!record.verhuurder) missingFields.push('verhuurder');
            if (!record.type) missingFields.push('type');
            if (record.kanReageren === null || record.kanReageren === undefined) missingFields.push('kanReageren');

            if (missingFields.length > 0) {
                recordsWithMissingData++;
                log.debug('Record has missing optional fields', {
                    id: record.id,
                    missingFields,
                });
            }

            log.info('Woning gevonden', {
                id: record.id,
                stad: record.stad,
                straat: record.straat,
                huur: record.huur,
                reacties: record.reacties,
            });

            await Actor.pushData(record);
            totalRecords++;
        }

        page++;
    } catch (error) {
        log.error('Error fetching page', {
            page,
            url,
            error: error instanceof Error ? error.message : String(error),
        });

        if (axios.isAxiosError(error)) {
            log.error('API error details', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
            });
        }

        throw error;
    }
}

log.info('Klaar met ophalen aanbod', {
    totalRecords,
    pagesProcessed: page,
    recordsWithMissingData,
});
await Actor.exit();