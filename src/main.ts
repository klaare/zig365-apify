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

while (page < totalPages && page < maxPages) {
    const url = `${BASE_URL}?limit=${limit}&locale=nl_NL&page=${page}&sort=%2BreactionData.aangepasteTotaleHuurprijs`;

    log.info(`Fetching page ${page}`, { url });

    const response = await axios.get(url, {
        headers: {
            accept: 'application/json',
        },
        timeout: 30000,
    });

    const { data, _metadata } = response.data;

    totalPages = _metadata.page_count;

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

        log.info('Woning gevonden', {
            id: record.id,
            stad: record.stad,
            huur: record.huur,
            reacties: record.reacties,
        });

        await Actor.pushData(record);
    }

    page++;
}

log.info('Klaar met ophalen aanbod');
await Actor.exit();