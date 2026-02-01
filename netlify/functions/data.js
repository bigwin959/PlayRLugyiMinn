// Native fetch is available in Node.js 18+ (Netlify default)

exports.handler = async (event, context) => {
    try {
        // 1. Configuration
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const BRANCH = 'main';
        const FILE_PATH = 'data.json';

        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        };

        // 2. Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing Connection Settings (GITHUB_TOKEN, REPO_OWNER, REPO_NAME)' })
            };
        }

        const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

        // 3. GET Request - Read Data
        if (event.httpMethod === 'GET') {
            try {
                const response = await fetch(API_URL, {
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3.raw' // Request raw content
                    }
                });

                if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);

                const data = await response.json();
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(data)
                };
            } catch (error) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: error.message })
                };
            }
        }

        // 4. POST Request - Save Data
        if (event.httpMethod === 'POST') {
            try {
                const newData = JSON.parse(event.body);

                // A. Get current file SHA (required for update)
                const currentFileReq = await fetch(API_URL, {
                    headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
                });

                if (!currentFileReq.ok) throw new Error('Failed to fetch current SHA');
                const currentFile = await currentFileReq.json();
                const startSha = currentFile.sha;

                // B. Commit Update
                const updateReq = await fetch(API_URL, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `Update data.json via Admin Panel [${new Date().toISOString()}]`,
                        content: Buffer.from(JSON.stringify(newData, null, 2)).toString('base64'),
                        sha: startSha,
                        branch: BRANCH
                    })
                });

                if (!updateReq.ok) {
                    const err = await updateReq.json();
                    throw new Error(`GitHub Commit Failed: ${err.message}`);
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Saved to GitHub' })
                };

            } catch (error) {
                console.error(error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: error.message })
                };
            }
        }

        return {
            statusCode: 405,
            headers,
            body: 'Method Not Allowed'
        };

    } catch (fatalError) {
        console.error('Fatal Function Error:', fatalError);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: `Server Error: ${fatalError.message}` })
        };
    }
};
