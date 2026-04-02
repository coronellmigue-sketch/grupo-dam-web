window.DAM_CLOUD_CONFIG = window.DAM_CLOUD_CONFIG || {
    enabled: true,
    provider: 'wix',
    wixStateUrl: './dam-state.wix.json',
    wixManagerUrl: '',
    mediaBaseUrl: '',
    wixInlineState: {
        version: 1,
        updatedAt: '2026-04-02T00:00:00.000Z',
        kv: {
            'dam-site-texts': '{"about":"Texto inicial desde Wix","recommended":"Texto recomendado","news":"Texto novedades"}',
            'dam-hero-slider-images': '["https://static.wixstatic.com/media/REEMPLAZA-1.jpg","https://static.wixstatic.com/media/REEMPLAZA-2.jpg"]',
            'dam-carousel-slide-1': '{"image":"https://static.wixstatic.com/media/REEMPLAZA-SLIDE1.jpg","title":"Titulo 1","desc":"Descripcion 1"}'
        },
        media: {
            'who-series-img-201': {
                path: 'https://static.wixstatic.com/media/9f1c09_26f1520e8c4a47b5b0d1d182efd5a7cb~mv2.png',
                updatedAt: '2026-04-02T00:00:00.000Z',
                size: 0,
                contentType: 'image/jpeg'
            }
        }
    },
    includeSensitiveAuthData: false
};
