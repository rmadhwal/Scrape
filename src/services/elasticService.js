import elasticsearch from 'elasticsearch';
import crypto from "crypto";

export const client = new elasticsearch.Client({ node: 'http://localhost:9200' });

export async function createIndex(index) {
    let indexExists = await checkIfIndexExists(index);
    if(!indexExists) {
        await client.indices.create({
            index
        })
    }
}

export async function addDocument(index, id, body) {
    const hashedId = crypto.createHash('md5').update(id).digest('hex');
    await client.index({
        id: hashedId,
        index,
        body
    });
}

export async function getDocumentInIndexById(index, id) {
    const hashedId = crypto.createHash('md5').update(id).digest('hex');
    return await client.get({
        id: hashedId,
        index
    })
}

async function checkIfIndexExists(index) {
    return await client.indices.exists({
        index
    });
}