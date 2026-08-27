// admin-3-pages-wiki.js — 관리자 콘솔 3/4
//
// 연동 가이드 · 대시보드 · 페이지 편집 · 위키 · 디자인 시스템
//
//
// 왜 확장자가 `.js` 인가(다른 관리자/공개 파일은 `.jsx` 인데): Cloudflare 는
// 응답 content-type 을 보고 압축할지 정하는데, `.jsx` 는 `text/jsx` 로 나가고
// 이 MIME 은 압축 대상 목록에 없다. 나누기 전 admin.html 은 brotli 로 124KB 였는데
// `.jsx` 넷으로 나누자 **649KB** 가 됐다 — 나눈 이득보다 큰 손해였다. `.js` 로
//두면 `text/javascript` 로 나가 압축된다.
// Babel 은 확장자를 보지 않는다 — 판단 기준은 script 태그의 `type="text/babel"` 이다.
// worker 에서 content-type 만 고쳐 보려 했으나 **닿지 않았다**: Workers Assets 는
// 자산이 존재하면 Worker 를 아예 거치지 않는다(보안 헤더가 안 붙는 것으로 확인).
//
// 주의: 공개 사이트의 `.jsx` 21개는 **아직 이 문제를 그대로 안고 있다**(홈 501KB).
//    이번 라운드에서 건드리지 않았다 — 참조가 여러 파일에 흩어져 있어 범위가 커진다.
// **이 네 파일은 순서대로 실행돼야 한다.** admin.html 의 <script> 순서가 곧
// 실행 순서이고, 뒤 파일이 앞 파일의 선언을 쓴다. 순서를 바꾸거나 하나를 빼면
// 관리자 화면이 통째로 뜨지 않는다.
//
// 왜 나뉘어 있나(v01.101.12): 원래 admin.html 안에 인라인 한 덩어리(51만 자)로
// 있었다. Babel-in-browser 가 500KB 를 넘으면 코드 생성 최적화를 포기해서
// ("exceeds the max of 500KB") 첫 로딩 파싱이 느려졌고, 인라인이라 admin.html
// 전체가 매번 다시 내려왔다. 파일로 나누면 바뀌지 않은 파일은 브라우저 캐시가 받는다.
//
// 나눌 때 **내용은 한 글자도 바꾸지 않았다** — 잘라내기만 했다(들여쓰기 포함).
// 그래서 이 파일들을 순서대로 이어 붙이면 원래 인라인 블록과 정확히 같다.
// 경계는 기계적 4등분에서 출발해 논리적으로 조정했다: 이 파일은
// `INTEGRATION_GUIDES` 에서 시작해 `DesignSystemTab` 에서 끝난다.

  // ---- API & integrations -------------------------------------------------
  // Two-section dashboard for everything the operator plugs the site into.
  //   1. Workers Secrets — read-only status (configured / not). Values
  //      stay in env; admin shows the wrangler command + a "Copy" button.
  //   2. Site verifications — public meta-tag tokens (Google / Naver / etc.)
  //      stored in c.site_verifications. Editable here; injected SERVER-SIDE
  //      by the Worker into <head> (serveSpaShell) so verification crawlers —
  //      which don't run JS — see them in the raw HTML. App.jsx also injects
  //      client-side as an idempotent fallback. Paste only the content="..." value.
  // Truly secret values are NEVER stored in c.* / KV / sessionStorage; only
  // their setdness is reported. See KMS · 9. API & 통합 보안 모델.
  // Step-by-step setup guides per service id. Rendered inline as <details>
  // panels next to the matching row. Operators can do the entire flow
  // without leaving the admin tab.
  const INTEGRATION_GUIDES = {
    ADMIN_TOKEN: {
      title: '관리자 토큰 회전 (공개 런칭 전 필수)',
      where: 'Cloudflare Workers Secret Store',
      steps: [
        '터미널에서 64자 랜덤 토큰 생성: <code>node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"</code>',
        '출력된 값 복사 (한 줄, 64자 hex).',
        '프로젝트 폴더로 이동: <code>cd /Users/jimmy_macmini/Desktop/VS_Code/DreamPath</code>',
        '<code>wrangler secret put ADMIN_TOKEN</code> 실행 → 프롬프트에 토큰 붙여넣기 → Enter.',
        '브라우저 어드민에서 로그아웃 → 새 토큰으로 로그인 (localStorage 청소).',
        '주의 — 새 토큰은 password manager에 보관 — 잊으면 같은 명령으로 재발급해야 함.',
      ],
    },
    RESEND_API_KEY: {
      title: 'Resend (트랜잭션 이메일)',
      where: 'https://resend.com',
      steps: [
        '<a href="https://resend.com/signup" target="_blank" rel="noopener">resend.com</a> 가입/로그인.',
        '좌측 메뉴 <strong>API Keys</strong> → <strong>Create API Key</strong>.',
        'Name: <code>dreampath-prod</code>, Permission: <strong>Full access</strong>, Domain: <strong>All</strong>.',
        '생성된 키(<code>re_...</code>) 즉시 복사 — 한 번만 표시됨.',
        '터미널: <code>cd /Users/jimmy_macmini/Desktop/VS_Code/DreamPath && wrangler secret put RESEND_API_KEY</code> → 프롬프트에 붙여넣기.',
        '주의 — 발신 도메인 인증 필요: Resend → <strong>Domains</strong> → <strong>Add Domain</strong> → <code>koreadreampath.com</code>.',
        'Resend가 표시하는 DNS 레코드(SPF/DKIM/Return-Path) 4개를 도메인 DNS에 추가 → <strong>Verify DNS Records</strong> 클릭.',
        '인증 완료 후 어드민 → Email templates → Send test 로 실제 발송 확인.',
      ],
    },
    STRIPE_SECRET_KEY: {
      title: 'Stripe (글로벌 결제)',
      where: 'https://stripe.com',
      steps: [
        '<a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener">dashboard.stripe.com</a> 가입.',
        '좌측 메뉴 <strong>Developers → API keys</strong>.',
        '<strong>Secret key</strong> 옆 <strong>Reveal live key</strong> 클릭 → <code>sk_live_...</code> 복사 (테스트는 <code>sk_test_...</code>).',
        '<code>wrangler secret put STRIPE_SECRET_KEY</code> 실행 → 붙여넣기.',
        'Webhook 추가: <strong>Developers → Webhooks → Add endpoint</strong> → URL <code>https://koreadreampath.com/api/webhooks/stripe</code>, Events <code>payment_intent.succeeded</code>, <code>payment_intent.payment_failed</code>.',
        'Webhook signing secret(<code>whsec_...</code>) 복사 → <code>wrangler secret put STRIPE_WEBHOOK_SECRET</code>.',
        '결제 통합은 별도 라운드 — 시크릿만 미리 등록해두는 것은 OK.',
      ],
    },
    TOSS_SECRET_KEY: {
      title: 'Toss Payments (한국 결제)',
      where: 'https://tosspayments.com',
      steps: [
        '<a href="https://www.tosspayments.com/" target="_blank" rel="noopener">tosspayments.com</a> 회원가입 + 사업자 인증.',
        '<strong>개발자센터 → API 키</strong>.',
        '<strong>시크릿 키</strong>(<code>test_sk_...</code> 또는 <code>live_sk_...</code>) 복사.',
        '<code>wrangler secret put TOSS_SECRET_KEY</code> → 붙여넣기.',
        '<strong>웹훅 등록</strong>: 개발자센터 → 웹훅 → URL <code>https://koreadreampath.com/api/webhooks/toss</code>, 이벤트: 결제 승인 / 가상계좌 입금 / 환불 완료.',
        '결제 통합은 별도 라운드.',
      ],
    },
    KAKAOPAY_SECRET_KEY: {
      title: 'KakaoPay (한국 모바일 결제)',
      where: 'https://payment.kakaopay.com',
      steps: [
        '<a href="https://developers.kakao.com" target="_blank" rel="noopener">developers.kakao.com</a> 가입 + 비즈니스 채널 등록.',
        '카카오페이 가맹점 신청 → 심사 (영업일 1–3일).',
        '심사 통과 후 <strong>Admin Key</strong> 또는 <strong>Service App Key</strong>(SECRET) 발급.',
        '<code>wrangler secret put KAKAOPAY_SECRET_KEY</code> → 붙여넣기.',
        '결제 통합은 별도 라운드.',
      ],
    },
    PORTONE_API_KEY: {
      title: 'PortOne / 아임포트 (한국 멀티-게이트웨이 통합)',
      where: 'https://portone.io',
      steps: [
        '<a href="https://portone.io" target="_blank" rel="noopener">portone.io</a> 가입.',
        '<strong>관리자 콘솔 → 결제 연동</strong>에서 사용할 PG들(KCP, 토스, 카카오페이 등) 활성화.',
        '<strong>API Keys</strong> 메뉴에서 <strong>API Key</strong> + <strong>API Secret</strong> 복사.',
        '<code>wrangler secret put PORTONE_API_KEY</code> → 붙여넣기 (필요시 SECRET도 별도).',
        'Webhook URL: <code>https://koreadreampath.com/api/webhooks/portone</code>.',
        '결제 통합은 별도 라운드.',
      ],
    },
    CF_API_TOKEN: {
      title: 'Cloudflare API Token (자동화용)',
      where: 'https://dash.cloudflare.com',
      steps: [
        'Cloudflare 대시보드 → 우상단 프로필 → <strong>My Profile → API Tokens → Create Token</strong>.',
        'Template <strong>"Edit Cloudflare Workers"</strong> 선택 (또는 Custom Token으로 D1 / KV / Workers Scripts:Edit 권한 부여).',
        'Account Resources: <code>scoutkorea@kakao.com\'s Account</code>로 제한.',
        '<strong>Create Token</strong> → 표시된 토큰 즉시 복사 (한 번만 표시됨).',
        '<code>wrangler secret put CF_API_TOKEN</code> → 붙여넣기.',
        '용도: 자동 시크릿 회전, 스케줄 백업, 외부 모니터링 통합 등.',
      ],
    },
    GOOGLE_OAUTH_SECRET: {
      title: 'Google OAuth (소셜 로그인)',
      where: 'https://console.cloud.google.com',
      steps: [
        '<a href="https://console.cloud.google.com" target="_blank" rel="noopener">Google Cloud Console</a> → 프로젝트 생성/선택.',
        '<strong>APIs & Services → OAuth consent screen</strong> 설정 (External, 앱 이름 KoreaDreamPath).',
        '<strong>APIs & Services → Credentials → Create Credentials → OAuth client ID</strong>.',
        'Application type: <strong>Web application</strong>.',
        'Authorized redirect URIs: <code>https://koreadreampath.com/api/auth/oauth/google/callback</code>.',
        '생성된 <strong>Client ID</strong>(공개)는 어드민 → Setup → OAuth providers (예정)에 입력.',
        '<strong>Client secret</strong>(비밀)은 <code>wrangler secret put GOOGLE_OAUTH_SECRET</code>.',
        'OAuth 통합은 별도 라운드.',
      ],
    },
    KAKAO_OAUTH_SECRET: {
      title: 'Kakao OAuth (카카오 로그인)',
      where: 'https://developers.kakao.com',
      steps: [
        '<a href="https://developers.kakao.com" target="_blank" rel="noopener">developers.kakao.com</a> 로그인 → <strong>내 애플리케이션 → 애플리케이션 추가</strong>.',
        '<strong>제품 설정 → 카카오 로그인</strong> → 활성화.',
        '<strong>Redirect URI</strong>: <code>https://koreadreampath.com/api/auth/oauth/kakao/callback</code>.',
        '<strong>앱 키 → REST API 키</strong>는 client_id 역할(공개).',
        '<strong>보안 → Client Secret</strong> 활성화 → 키 발급 후 <code>wrangler secret put KAKAO_OAUTH_SECRET</code>.',
        'OAuth 통합은 별도 라운드.',
      ],
    },
    APPLE_OAUTH_SECRET: {
      title: 'Apple Sign In',
      where: 'https://developer.apple.com',
      steps: [
        'Apple Developer 계정($99/년) 필요.',
        '<strong>Certificates, IDs &amp; Profiles → Identifiers → Services IDs</strong> → 새로 생성.',
        '"Sign In with Apple" 활성화 + Return URL <code>https://koreadreampath.com/api/auth/oauth/apple/callback</code>.',
        '<strong>Keys</strong> → <strong>+</strong> → "Sign In with Apple" 활성화 → key 다운로드 (.p8 파일, 한 번만).',
        '클라이언트 시크릿 JWT 생성 (key + team_id + key_id) → <code>wrangler secret put APPLE_OAUTH_SECRET</code>.',
        'Apple은 시크릿이 6개월마다 만료됨 — 자동 갱신 cron 필요.',
        'OAuth 통합은 별도 라운드.',
      ],
    },
  };

  // Cloudflare Email Routing — separate setup guide called out in the
  // Integrations tab since it doesn't fit in either secrets or verifications.
  const EMAIL_ROUTING_GUIDE = {
    title: '받은 메일 (Cloudflare Email Routing)',
    where: 'https://dash.cloudflare.com → koreadreampath.com → Email → Email Routing',
    steps: [
      'Cloudflare 대시보드 → <code>koreadreampath.com</code> 도메인 선택 → 좌측 메뉴 <strong>Email → Email Routing</strong>.',
      '<strong>Get started</strong> 클릭. Cloudflare가 도메인 DNS에 MX 레코드 + SPF TXT 레코드를 자동 추가 (대시보드에서 한 번만 클릭하면 됨).',
      'DNS 전파 대기 (보통 1–5분).',
      '<strong>Routing rules → Custom address → Create address</strong>.',
      '<strong>Custom address</strong>: <code>hello</code> (즉 <code>hello@koreadreampath.com</code>).',
      '<strong>Action</strong>: <strong>Send to a Worker</strong>.',
      '<strong>Destination Worker</strong>: <code>dream-path</code> 선택.',
      '저장. 같은 방식으로 <code>partner</code>, <code>info</code> 등 관리할 모든 주소를 각각 추가.',
      '주의 — 이미 다른 곳(Gmail 등)으로 포워딩 중이라면 그 규칙을 먼저 비활성화. 한 주소당 한 라우팅 규칙만 동작.',
      '받은 메일 검증: 외부 메일 클라이언트(개인 Gmail 등)에서 <code>hello@koreadreampath.com</code>으로 테스트 메일 발송 → 1분 내 어드민 → 메일함 → 받은 메일에 표시되어야 함.',
      '주의 — 수신 보존: D1 무료 플랜은 5GB 한계. 첨부파일은 현재 R2 미연동이라 본문만 저장(메타데이터만 기록). 대용량 파일이 자주 오는 주소는 별도 처리 필요.',
    ],
  };

  const VERIFICATION_GUIDES = {
    google: {
      title: 'Google Search Console',
      steps: [
        '<a href="https://search.google.com/search-console" target="_blank" rel="noopener">Search Console</a> → <strong>속성 추가</strong> → URL 접두사 → <code>https://koreadreampath.com</code>.',
        '소유권 확인 방법 중 <strong>HTML 태그</strong> 선택.',
        '표시되는 <code>&lt;meta name="google-site-verification" content="ABC123..."&gt;</code> 에서 <strong>content="..." 안의 값만</strong> 복사.',
        '아래 입력란에 붙여넣고 저장.',
        'Search Console로 돌아가서 <strong>확인</strong> 클릭. App.jsx가 head에 meta 태그를 즉시 주입.',
        '확인 완료 후 <strong>Sitemaps</strong> 메뉴에서 <code>https://koreadreampath.com/sitemap.xml</code> 제출.',
      ],
    },
    naver: {
      title: 'Naver Search Advisor',
      steps: [
        '<a href="https://searchadvisor.naver.com" target="_blank" rel="noopener">searchadvisor.naver.com</a> 로그인 → <strong>웹마스터 도구 → 사이트 등록</strong>.',
        'URL <code>https://koreadreampath.com</code> 입력.',
        '소유권 확인: <strong>HTML 태그</strong>.',
        'content 값만 복사 → 아래 붙여넣고 저장.',
        '네이버에서 <strong>소유확인</strong> 클릭.',
        '<strong>요청 → 사이트맵 제출</strong> → <code>sitemap.xml</code>, <strong>RSS 제출</strong> → 옵션.',
      ],
    },
    bing: {
      title: 'Bing Webmaster Tools',
      steps: [
        '<a href="https://www.bing.com/webmasters/" target="_blank" rel="noopener">bing.com/webmasters</a> 로그인.',
        '<strong>Add a site</strong> → URL 입력 → 옵션 중 <strong>Import from Google Search Console</strong> 추천 (이미 GSC 등록돼 있으면 1-click).',
        '수동: <strong>Meta tag</strong> 옵션 → content 값 복사 → 아래 붙여넣고 저장.',
        'Bing에서 <strong>Verify</strong> 클릭.',
        '<strong>Sitemaps</strong> 메뉴 → <code>sitemap.xml</code> 제출.',
      ],
    },
    facebook: {
      title: 'Facebook Domain Verification',
      steps: [
        '<a href="https://business.facebook.com/" target="_blank" rel="noopener">business.facebook.com</a> → <strong>Brand Safety → Domains → Add</strong>.',
        '<code>koreadreampath.com</code> 입력.',
        'Verify 방법 중 <strong>Meta-tag verification</strong>.',
        'content 값만 복사 → 아래 입력란에 붙여넣고 저장.',
        'Facebook에서 <strong>Verify domain</strong> 클릭.',
        '용도: Facebook/Instagram 광고에서 도메인 신뢰도 / Open Graph 우선권.',
      ],
    },
    pinterest: {
      title: 'Pinterest Site Verification',
      steps: [
        '<a href="https://www.pinterest.com/business/create/" target="_blank" rel="noopener">Pinterest Business</a> 계정 생성.',
        '<strong>Settings → Claimed accounts → Websites → Claim</strong>.',
        'Add HTML tag 옵션 선택 → content 값만 복사 → 아래 붙여넣고 저장.',
        'Pinterest에서 <strong>Submit for review</strong>. 통과까지 최대 24시간.',
      ],
    },
    yandex: {
      title: 'Yandex Webmaster',
      steps: [
        '<a href="https://webmaster.yandex.com/" target="_blank" rel="noopener">webmaster.yandex.com</a> 로그인.',
        '<strong>Add site</strong> → URL 입력.',
        'Verify 방법: <strong>Meta tag</strong> → content 값 복사 → 아래 붙여넣고 저장.',
        'Yandex에서 <strong>Verify</strong>. 러시아권 SEO 필요시에만.',
      ],
    },
  };

  function IntegrationsTab({ c, set }) {
    const [statusItems, setStatusItems] = useState([]);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusErr, setStatusErr] = useState('');

    async function refreshStatus() {
      setStatusLoading(true); setStatusErr('');
      try {
        const token = adminToken();
        const r = await fetch('/api/admin/integrations/status', { headers: authHeaders() });
        if (!r.ok) throw new Error('http_' + r.status);
        const d = await r.json();
        setStatusItems(d.items || []);
      } catch (e) { setStatusErr(String(e.message || e)); }
      finally { setStatusLoading(false); }
    }
    useEffect(() => { refreshStatus(); }, []);

    function copy(text) {
      try { navigator.clipboard.writeText(text); } catch {}
    }

    const sv = c.site_verifications || {};
    const VERIFY_ROWS = [
      { key: 'google',    label: 'Google Search Console',     hint: 'Search Console → 속성 추가 → HTML 태그 → content="..." 값만 붙여넣기',                    docs: 'https://search.google.com/search-console' },
      { key: 'naver',     label: 'Naver Search Advisor',      hint: '네이버 서치어드바이저 → 사이트 등록 → HTML 태그 → content="..." 값',                       docs: 'https://searchadvisor.naver.com/' },
      { key: 'bing',      label: 'Bing Webmaster Tools',      hint: 'Bing Webmaster → Add Site → Meta tag → content="..." 값',                                  docs: 'https://www.bing.com/webmasters/' },
      { key: 'facebook',  label: 'Facebook Domain Verification', hint: 'Meta Business Suite → Brand Safety → Domains → Meta-tag verification',                  docs: 'https://business.facebook.com/' },
      { key: 'pinterest', label: 'Pinterest Site Verification', hint: 'Pinterest Business → Settings → Claimed accounts → Add HTML tag',                        docs: 'https://www.pinterest.com/business/' },
      { key: 'yandex',    label: 'Yandex Webmaster',          hint: 'Yandex Webmaster → 사이트 추가 → Meta-tag verification',                                   docs: 'https://webmaster.yandex.com/' },
    ];

    return (
      <>
        {/* Security model preface — operators must understand WHY some
            keys live in env and others in KV. */}
        <details className="card admin-fold" style={{background:'var(--state-info-bg)',borderColor:'var(--state-info)'}} open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{color:'var(--state-info)',margin:'0 0 6px'}}>두 가지 종류의 키</h3></summary>
          <div className="desc" style={{color:'var(--state-info)',fontSize:13,lineHeight:1.6}}>
            <p style={{margin:'0 0 8px'}}><strong>1. 시크릿 (env에만 보관):</strong> Resend API 키, 결제 시크릿, OAuth client_secret 등. <code>/api/content</code>는 public이므로 KV에 절대 저장하지 않습니다. 등록 방법: <code>wrangler secret put NAME</code></p>
            <p style={{margin:0}}><strong>2. 공개 인증 토큰 (KV에 보관):</strong> Google / Naver / Bing 등 검색엔진 도메인 verification. 어차피 HTML head에 노출돼야 정상 작동하므로 어드민에서 직접 입력합니다.</p>
          </div>
        </details>

        {/* Section 1: Workers secrets — read-only status */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div>
              <h3 style={{margin:0}}>Workers Secrets · 시크릿 상태</h3>
              <p className="desc" style={{margin:'4px 0 0'}}>각 시크릿이 등록되어 있는지만 표시 — 값은 절대 어드민에 노출되지 않습니다.</p>
            </div>
            <button type="button" className="icon-btn" onClick={refreshStatus} disabled={statusLoading}>{statusLoading ? '…' : 'Refresh'}</button>
          </div>
          {statusErr && <div role="alert" style={{color:'var(--state-danger)',fontSize:13}}>{statusErr}</div>}
          <div>
            {statusItems.map(s => {
              const cmd = `wrangler secret put ${s.id}`;
              const guide = INTEGRATION_GUIDES[s.id];
              return (
                <div key={s.id} style={{padding:'14px 0',borderBottom:'1px solid var(--border-hair)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                    <div style={{flex:'1 1 280px',minWidth:0}}>
                      <strong>{s.label}</strong>
                      {s.critical && !s.configured && <span style={{marginLeft:8,fontSize:11,color:'var(--state-danger)',fontWeight:700}}>· REQUIRED</span>}
                      <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-muted)',marginTop:2}}>{s.id}</div>
                    </div>
                    <div>
                      {s.configured
                        ? <span className="pill" style={{background:'var(--state-success-bg)',color:'var(--state-success)'}}>✓ Configured</span>
                        : <span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-muted)'}}>— Not set</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <code style={{fontSize:11,fontFamily:'var(--font-mono)',background:'var(--bg-muted)',padding:'4px 8px',borderRadius:6}}>{cmd}</code>
                      <button type="button" className="icon-btn" onClick={() => copy(cmd)}>Copy</button>
                    </div>
                  </div>
                  {guide && (
                    <details style={{marginTop:10,marginLeft:0}}>
                      <summary style={{cursor:'pointer',fontSize:13,color:'var(--brand-text)',fontWeight:600,padding:'4px 0'}}>등록 방법 (step-by-step)</summary>
                      <div style={{marginTop:10,padding:'14px 18px',background:'var(--bg-muted)',borderRadius:10,fontSize:13,lineHeight:1.7,color:'var(--fg-primary)'}}>
                        <div style={{fontWeight:700,marginBottom:6}}>{guide.title}</div>
                        {guide.where && <div style={{fontSize:12,color:'var(--fg-muted)',marginBottom:10,fontFamily:'var(--font-mono)'}}>{guide.where}</div>}
                        <ol style={{margin:0,paddingLeft:22}}>
                          {guide.steps.map((step, i) => (
                            <li key={i} style={{marginBottom:6}} dangerouslySetInnerHTML={{ __html: step }} />
                          ))}
                        </ol>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
          <details style={{marginTop:14,fontSize:13,color:'var(--fg-secondary)'}}>
            <summary style={{cursor:'pointer',fontWeight:600}}>왜 어드민에서 직접 등록하지 않나요?</summary>
            <ul style={{marginTop:8,lineHeight:1.7}}>
              <li><code>/api/content</code>(KV blob)는 SPA가 콘텐츠를 가져오기 위한 <strong>public 엔드포인트</strong>입니다. KV에 키를 넣으면 모든 방문자 브라우저로 흘러갑니다.</li>
              <li>sessionStorage에도 캐싱되므로 같은 디바이스의 다음 방문자에게도 노출됩니다.</li>
              <li>"JSON 내보내기" 백업 파일에도 그대로 들어갑니다.</li>
              <li><code>wrangler secret put</code>은 값을 Cloudflare에 직접 업로드 — 코드/git/콘솔 어디에도 안 남습니다. 워커가 실행될 때만 <code>env.NAME</code>으로 읽힙니다.</li>
            </ul>
          </details>
        </div>

        {/* Section 1.5: Cloudflare Email Routing — receiving inbound mail */}
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Cloudflare Email Routing · 받은 메일</h3></summary>
          <p className="desc">
            메일함 (관리자 → Mailbox)에서 받은 메일을 보려면 Cloudflare 대시보드에서 Email Routing을 활성화하고 워커로 라우팅 규칙을 추가해야 합니다. 발송은 Resend로, 수신은 Email Routing으로 — 두 시스템이 분리되어 있음.
          </p>
          <details>
            <summary style={{cursor:'pointer',fontSize:13,color:'var(--brand-text)',fontWeight:600,padding:'4px 0'}}>등록 방법 (step-by-step)</summary>
            <div style={{marginTop:10,padding:'14px 18px',background:'var(--bg-muted)',borderRadius:10,fontSize:13,lineHeight:1.7,color:'var(--fg-primary)'}}>
              <div style={{fontWeight:700,marginBottom:6}}>{EMAIL_ROUTING_GUIDE.title}</div>
              <div style={{fontSize:12,color:'var(--fg-muted)',marginBottom:10,fontFamily:'var(--font-mono)'}}>{EMAIL_ROUTING_GUIDE.where}</div>
              <ol style={{margin:0,paddingLeft:22}}>
                {EMAIL_ROUTING_GUIDE.steps.map((step, i) => (
                  <li key={i} style={{marginBottom:6}} dangerouslySetInnerHTML={{ __html: step }} />
                ))}
              </ol>
            </div>
          </details>
        </details>

        {/* Section 2: Public verification tokens — editable */}
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Site verification · 공개 인증 토큰</h3></summary>
          <p className="desc">검색엔진·소셜 플랫폼에 도메인 소유권 증명. 입력한 값은 모든 페이지의 <code>&lt;head&gt;</code>에 자동 주입됩니다. 값이 비어있는 항목은 무시됩니다.</p>
          {VERIFY_ROWS.map(row => {
            const guide = VERIFICATION_GUIDES[row.key];
            const isSet = !!sv[row.key];
            return (
              <div key={row.key} style={{padding:'14px 0',borderBottom:'1px solid var(--border-hair)'}}>
                <div className="grid-3 tight">
                  <div className="field">
                    <label>{row.label}</label>
                    <a href={row.docs} target="_blank" rel="noopener" style={{fontSize:11,color:'var(--brand-text)',textDecoration:'underline'}}>{row.docs.replace(/^https?:\/\//, '')} ↗</a>
                    <div style={{marginTop:6}}>
                      {isSet
                        ? <span className="pill" style={{background:'var(--state-success-bg)',color:'var(--state-success)'}}>✓ Active</span>
                        : <span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-muted)'}}>— Empty</span>}
                    </div>
                  </div>
                  <div className="field span-2">
                    <label>Verification value</label>
                    <input type="text" value={sv[row.key] || ''} onChange={e => set(['site_verifications',row.key], e.target.value)} placeholder='content="..." 값만 붙여넣기' />
                    <span className="hint">{row.hint}</span>
                  </div>
                </div>
                {guide && (
                  <details style={{marginTop:10}}>
                    <summary style={{cursor:'pointer',fontSize:13,color:'var(--brand-text)',fontWeight:600,padding:'4px 0'}}>등록 방법 (step-by-step)</summary>
                    <div style={{marginTop:10,padding:'14px 18px',background:'var(--bg-muted)',borderRadius:10,fontSize:13,lineHeight:1.7,color:'var(--fg-primary)'}}>
                      <div style={{fontWeight:700,marginBottom:10}}>{guide.title}</div>
                      <ol style={{margin:0,paddingLeft:22}}>
                        {guide.steps.map((step, i) => (
                          <li key={i} style={{marginBottom:6}} dangerouslySetInnerHTML={{ __html: step }} />
                        ))}
                      </ol>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </details>
      </>
    );
  }

  // ---- Top notice banner --------------------------------------------------
  function NoticeTab({ c, set }) {
    const n = c.notice || {};
    const eg = (c && c.entry_gate) || {};
    const egOn = eg.enabled === true;   // 기본값 false (content-store 기본과 일치)
    return (
      <>
      {/* 진입 안내 게이트 — 접속 시마다 뜨는 전체화면 고지 모달. 2026-08-22
          운영자 요청으로 꺼둔 상태이며, 여기서 다시 켤 수 있다. */}
      <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>진입 안내 게이트 (전체화면 고지) <span style={{fontSize:12,fontWeight:700,marginLeft:8,padding:'2px 10px',borderRadius:999,background: egOn ? 'var(--state-warning-bg)' : 'var(--bg-muted)',color: egOn ? 'var(--state-warning)' : 'var(--fg-muted)'}}>{egOn ? '표시 중' : '꺼짐'}</span></h3></summary>
        <p style={{fontSize:13,color:'var(--fg-muted)',margin:'4px 0 14px',lineHeight:1.7}}>
          켜면 방문자가 <strong>접속할 때마다</strong> 전체화면 안내 모달을 보고, 동의 체크 후에만 사이트로 들어갑니다.
          정보가 확정되지 않은 기간에만 쓰는 임시 게이트입니다.
        </p>
        <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,fontSize:14,fontWeight:600}}>
          <input type="checkbox" checked={egOn} onChange={e => set(['entry_gate','enabled'], e.target.checked)} />
          진입 안내 게이트 표시
        </label>
        <div className="grid-2 tight">
          <Text label="제목 (KO)" value={eg.title_ko} onChange={v => set(['entry_gate','title_ko'], v)} lang="ko" />
          <Text label="제목 (EN)" value={eg.title_en} onChange={v => set(['entry_gate','title_en'], v)} lang="en" />
          <Area label="본문 (KO)" value={eg.body_ko} onChange={v => set(['entry_gate','body_ko'], v)} rows={4} lang="ko" />
          <Area label="본문 (EN)" value={eg.body_en} onChange={v => set(['entry_gate','body_en'], v)} rows={4} lang="en" />
          <Text label="체크 라벨 (KO)" value={eg.check_ko} onChange={v => set(['entry_gate','check_ko'], v)} lang="ko" />
          <Text label="체크 라벨 (EN)" value={eg.check_en} onChange={v => set(['entry_gate','check_en'], v)} lang="en" />
          <Text label="입장 버튼 (KO)" value={eg.button_ko} onChange={v => set(['entry_gate','button_ko'], v)} lang="ko" />
          <Text label="입장 버튼 (EN)" value={eg.button_en} onChange={v => set(['entry_gate','button_en'], v)} lang="en" />
        </div>
      </details>
      <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Top notice banner</h3></summary>
        <p className="desc">A diagonal-stripe banner shown at the very top of every page on the public site. Use it for "under development" notices, launch countdowns, or maintenance windows.</p>
        <div className="grid-2 tight">
          <div className="field">
            <label>Enabled</label>
            <select value={n.enabled === false ? 'no' : 'yes'} onChange={e => set(['notice','enabled'], e.target.value === 'yes')}>
              <option value="yes">Show on all pages</option>
              <option value="no">Hide</option>
            </select>
          </div>
          <div className="field">
            <label>Style</label>
            <select value={n.style || 'dev'} onChange={e => set(['notice','style'], e.target.value)}>
              <option value="dev">dev (yellow stripe — under development)</option>
              <option value="info">info (blue — announcements)</option>
              <option value="warning">warning (amber — heads-up)</option>
            </select>
          </div>
          <Text label="Message (EN)" value={n.en || ''} onChange={v => set(['notice','en'], v)} lang="en" />
        </div>
      </details>
      </>
    );
  }

  // ---- OG / SEO images ----------------------------------------------------
  // Manages the social-card meta (og:image, og:title, og:description) for
  // every public route. Empty per-page fields fall back to og.default;
  // empty default falls back to the static <head> values in index.html.
  function OgImagesTab({ c, set }) {
    const og = c.og || { default: {}, pages: {} };
    const PAGES = [
      { id: 'home',         label: 'Homepage',     path: '/' },
      { id: 'about',        label: 'About',        path: '/about' },
      { id: 'programs',     label: 'Programs',     path: '/programs' },
      { id: 'scholarships', label: 'Scholarships', path: '/scholarships' },
      { id: 'apply',        label: 'Apply',        path: '/apply' },
      { id: 'partners',     label: 'Partners',     path: '/partners' },
      { id: 'stories',      label: 'Stories',      path: '/stories' },
      { id: 'news',         label: 'News',         path: '/news' },
      { id: 'contact',      label: 'Contact',      path: '/contact' },
      { id: 'team',         label: 'Project team', path: '/team' },
    ];
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>How it works</h3></summary>
          <p className="desc">
            Set a default OG image and per-route overrides. The public site updates&nbsp;
            <code>&lt;title&gt;</code>, <code>og:title</code>, <code>og:description</code>, and <code>og:image</code> on every navigation.
            Recommended dimensions: <strong>1200 × 630</strong> px (1.91:1).
            파일을 직접 업로드하거나 (PNG / JPG / WebP, 최대 1.5 MB), CDN URL을 붙여 넣을 수 있습니다.
            SVG는 페이스북·트위터·카카오 미리보기에서 렌더되지 않으므로 OG 이미지에는 권장하지 않습니다.
          </p>
        </details>

        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Default (site-wide fallback)</h3></summary>
          <p className="desc">Used on any page that doesn't set its own OG image. Leave empty to keep the static defaults from <code>index.html</code>.</p>
          <ImageUploadField
            label="OG image"
            value={og.default?.image || ''}
            onChange={v => set(['og','default','image'], v)}
            accept="image/png,image/jpeg,image/webp"
            maxBytes={1.5 * 1024 * 1024}
            preview="banner"
          />
          <div className="grid-2 tight">
            <Text label="Title (EN)" value={og.default?.title_en || ''} onChange={v => set(['og','default','title_en'], v)} lang="en" />
            <Area label="Description (EN)" value={og.default?.desc_en || ''} onChange={v => set(['og','default','desc_en'], v)} lang="en" rows={2} />
          </div>
        </details>

        {PAGES.map(p => {
          const pg = (og.pages && og.pages[p.id]) || {};
          return (
            <details className="card admin-fold" key={p.id} open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>{p.label} <span style={{fontSize:12,color:'var(--fg-muted)',fontWeight:400,fontFamily:'var(--font-mono)'}}>· {p.path}</span></h3></summary>
              <ImageUploadField
                label="OG image (override)"
                value={pg.image || ''}
                onChange={v => set(['og','pages',p.id,'image'], v)}
                accept="image/png,image/jpeg,image/webp"
                maxBytes={1.5 * 1024 * 1024}
                preview="banner"
                hint="비워두면 기본 OG 이미지를 사용합니다."
              />
              <div className="grid-2 tight">
                <Text label="Title (EN)" value={pg.title_en || ''} onChange={v => set(['og','pages',p.id,'title_en'], v)} lang="en" hint="Empty = page <title>" />
                <Area label="Description (EN)" value={pg.desc_en || ''} onChange={v => set(['og','pages',p.id,'desc_en'], v)} lang="en" rows={2} />
              </div>
            </details>
          );
        })}
      </>
    );
  }

  // ---- Dashboard ----------------------------------------------------------
  // At-a-glance overview: site version, key counts, recent activity, and
  // quick links into the most-used tabs. Stays read-only — no editing here.
  function DashboardTab({ c, setTab }) {
    const [data, setData] = useState({
      apps: null, inquiries: null, errors: null, members: null,
      ana7: null, ana30: null, dailySeries: [], weeklySeries: [],
      topPaths: [], sources: [], consents: null,
    });
    const [recentApps, setRecentApps] = useState([]);
    const [recentInq, setRecentInq] = useState([]);
    const [recentErrors, setRecentErrors] = useState([]);
    const [recentMembers, setRecentMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const token = adminToken();
      const auth = authHeaders();
      const get = (u) => fetch(u, { headers: auth }).then(r => r.ok ? r.json() : null).catch(() => null);
      Promise.all([
        get('/api/applications?limit=500'),
        get('/api/inquiries'),
        // Unresolved faults only. `info` is excluded on purpose: the email
        // worker logs one success line per delivered message, and counting
        // those made the console read "71 errors" with nothing broken.
        get('/api/errors?limit=100&resolved=0&level=error,warn'),
        get('/api/analytics/summary?days=7'),
        get('/api/analytics/summary?days=30'),
        get('/api/admin/users'),
        get('/api/consents?days=30'),
      ]).then(([apps, inq, errs, ana7, ana30, users, cons]) => {
        const daily = ana30?.daily || [];
        // Build week-over-week series: total sessions per ISO week (last 8 weeks)
        const weekMap = new Map();
        daily.forEach(d => {
          const dt = new Date(d.day + 'T00:00:00Z');
          const monday = new Date(dt);
          monday.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
          const key = monday.toISOString().slice(0, 10);
          weekMap.set(key, (weekMap.get(key) || 0) + (d.sessions || 0));
        });
        const weeks = [...weekMap.entries()].sort().slice(-8).map(([day, sessions]) => ({ day, sessions }));

        setData({
          apps: apps?.items?.length ?? 0,
          inquiries: inq?.items?.length ?? 0,
          errors: errs?.items?.length ?? 0,
          members: users?.items?.length ?? 0,
          ana7: ana7?.totals || null,
          ana30: ana30?.totals || null,
          dailySeries: daily.slice(-14),
          weeklySeries: weeks,
          topPaths: (ana30?.top_paths || []).slice(0, 6),
          sources: ana30?.sources || [],
          consents: cons?.items?.length ?? 0,
        });
        setRecentApps((apps?.items || []).slice(0, 5));
        setRecentInq((inq?.items || []).slice(0, 5));
        setRecentErrors((errs?.items || []).slice(0, 5));
        setRecentMembers((users?.items || []).slice(0, 5));
        setLoading(false);
      });
    }, []);

    // Compute trend % between last 7 days and prior 7 days from daily series
    const trend = (() => {
      if (data.dailySeries.length < 14) return null;
      const last7 = data.dailySeries.slice(-7).reduce((s, d) => s + (d.sessions || 0), 0);
      const prev7 = data.dailySeries.slice(-14, -7).reduce((s, d) => s + (d.sessions || 0), 0);
      if (prev7 === 0) return null;
      return Math.round(((last7 - prev7) / prev7) * 100);
    })();

    const Stat = ({ label, value, accent = 'var(--brand-text)', sub, onClick }) => (
      <div className="card" onClick={onClick} style={{margin:0,padding:'18px 22px',display:'flex',flexDirection:'column',gap:4,cursor:onClick?'pointer':'default'}}>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--fg-muted)'}}>{label}</span>
        <span style={{fontFamily:'var(--font-en)',fontSize:30,fontWeight:700,color:accent,lineHeight:1}}>{value === null ? '…' : value.toLocaleString()}</span>
        {sub && <span style={{fontSize:11,color:'var(--fg-muted)',marginTop:2}}>{sub}</span>}
      </div>
    );

    // Inline SVG sparkline from a series of {day, sessions}. Smoothed with a
    // Catmull-Rom→bezier curve + soft area fill so the trend reads as a calm
    // line rather than a jittery zig-zag.
    function Spark({ series, color = '#6B2DBE', height = 36 }) {
      if (!series.length) return <div style={{height,display:'grid',placeItems:'center',color:'var(--fg-muted)',fontSize:11}}>no data</div>;
      const w = 200;
      const max = Math.max(1, ...series.map(d => d.sessions || 0));
      const step = w / Math.max(1, series.length - 1);
      const pts = series.map((d, i) => ({ x: i * step, y: height - (d.sessions / max) * (height - 8) - 4 }));
      // Smooth path via Catmull-Rom converted to cubic beziers.
      let line = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      if (pts.length === 1) { line += ` L${w},${pts[0].y.toFixed(1)}`; }
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      const gid = 'spk-' + color.replace(/[^a-z0-9]/gi, '');
      const last = pts[pts.length - 1];
      return (
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{width:'100%',height,display:'block',overflow:'visible'}}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${w.toFixed(1)},${height} L0,${height} Z`} fill={`url(#${gid})`} stroke="none" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="2.4" fill={color} vectorEffect="non-scaling-stroke" />
        </svg>
      );
    }

    const Quick = ({ id, label, icon }) => (
      <button type="button" onClick={() => setTab(id)} style={{textAlign:'left',padding:'14px 18px',background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)',borderRadius:10,fontSize:13,fontWeight:600,color:'var(--fg-primary)',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:10,transition:'all 120ms'}}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--scouting-purple)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'none'; }}>
        <i data-lucide={icon} width="16" height="16" style={{color:'var(--scouting-purple)'}} />
        <span style={{flex:1}}>{label}</span>
        <span style={{color:'var(--fg-muted)',fontWeight:400}}>→</span>
      </button>
    );

    const programsCount = (c.programs || []).length;
    const partnersCount = (c.partners || []).length;
    const storiesCount = (c.stories || []).length;
    const newsCount = 0; // news is in D1; dashboard doesn't fetch — placeholder

    const trendBadge = trend === null ? null : (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999,background:trend>=0?'#DCFCE7':'#FEE2E2',color:trend>=0?'#166534':'#B91C1C'}}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs prev 7d
      </span>
    );

    const errorAccent = data.errors > 5 ? '#B91C1C' : data.errors > 0 ? '#92400E' : 'var(--forest-green)';

    return (
      <>
        {/* Hero — version + sync time + open site */}
        <div className="card" style={{background:'linear-gradient(135deg, #0F0A30 0%, #1E1654 100%)',color:'#fff',border:'none'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',marginBottom:6}}>KoreaDreamPath · Admin Console</div>
              <div style={{fontFamily:'var(--font-en)',fontSize:30,fontWeight:700,letterSpacing:'-0.02em'}}>v {window.DREAMPATH_VERSION || '00.000.00'}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginTop:6}}>
                {data.errors > 0
                  ? <span style={{color:'var(--state-danger)'}}>● {data.errors} error{data.errors===1?'':'s'} logged in last 100 events</span>
                  : <span style={{color:'var(--state-success)'}}>● All systems healthy · last 100 events clean</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              {/* Yellow surface — keep midnight-purple text (always dark, regardless of theme). */}
              <a href="/" target="_blank" rel="noopener" style={{padding:'10px 18px',background:'#FFC93E',color:'#1E1654',borderRadius:8,fontWeight:700,textDecoration:'none',fontSize:13}}>Open live site ↗</a>
              <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener" style={{padding:'10px 18px',background:'rgba(255,255,255,0.1)',color:'#fff',borderRadius:8,fontWeight:600,textDecoration:'none',fontSize:13,border:'1px solid rgba(255,255,255,0.2)'}}>Cloudflare ↗</a>
            </div>
          </div>
        </div>

        {/* Top-line counts */}
        <div className="grid-4" style={{marginBottom:18}}>
          <Stat label="Members" value={data.members} sub="Registered users" onClick={() => setTab('members')} />
          <Stat label="Applications" value={data.apps} accent="#6B2DBE" sub="All-time submissions" onClick={() => setTab('apps')} />
          <Stat label="Inquiries" value={data.inquiries} accent="#0094B4" sub="Contact-form messages" onClick={() => setTab('inquiries')} />
          <Stat label="Error logs" value={data.errors} accent={errorAccent} sub="Last 100 reports" onClick={() => setTab('error_logs')} />
        </div>

        {/* Marketing block — daily/weekly visitors + trend */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:14,gap:14}}>
            <h3 style={{margin:0}}>Marketing snapshot</h3>
            {trendBadge}
          </div>
          <div className="grid-4" style={{marginBottom:14}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:4}}>Sessions · 7d</div>
              <div style={{fontFamily:'var(--font-en)',fontSize:24,fontWeight:700,color:'var(--brand-text)',lineHeight:1}}>{(data.ana7?.sessions ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:4}}>Pageviews · 7d</div>
              <div style={{fontFamily:'var(--font-en)',fontSize:24,fontWeight:700,color:'var(--brand-text)',lineHeight:1}}>{(data.ana7?.pageviews ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:4}}>Sessions · 30d</div>
              <div style={{fontFamily:'var(--font-en)',fontSize:24,fontWeight:700,color:'var(--scouting-purple)',lineHeight:1}}>{(data.ana30?.sessions ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:4}}>Logged-in users · 30d</div>
              <div style={{fontFamily:'var(--font-en)',fontSize:24,fontWeight:700,color:'var(--scouting-purple)',lineHeight:1}}>{(data.ana30?.users ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <div className="grid-2" style={{gap:14}}>
            <div style={{padding:14,background:'var(--bg-muted)',borderRadius:10}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:8}}>Daily sessions · last 14 days</div>
              <Spark series={data.dailySeries} color="#6B2DBE" height={48} />
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>
                <span>{data.dailySeries[0]?.day || ''}</span>
                <span>{data.dailySeries[data.dailySeries.length-1]?.day || ''}</span>
              </div>
            </div>
            <div style={{padding:14,background:'var(--bg-muted)',borderRadius:10}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:8}}>Weekly sessions · last 8 weeks</div>
              <Spark series={data.weeklySeries} color="#0094B4" height={48} />
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>
                <span>w/c {data.weeklySeries[0]?.day || ''}</span>
                <span>w/c {data.weeklySeries[data.weeklySeries.length-1]?.day || ''}</span>
              </div>
            </div>
          </div>
          <div style={{marginTop:14,textAlign:'right'}}>
            <button type="button" className="icon-btn" onClick={() => setTab('analytics')}>Open analytics →</button>
          </div>
        </div>

        {/* Top pages + traffic sources */}
        <div className="grid-2">
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Top pages · 30d</h3></summary>
            {loading ? <p className="desc">Loading…</p>
             : data.topPaths.length === 0 ? <p className="desc">No pageviews yet.</p>
             : (
              <table className="apps-table" style={{fontSize:12}}>
                <thead><tr><th>Path</th><th style={{textAlign:'right'}}>Hits</th><th style={{textAlign:'right'}}>Sessions</th></tr></thead>
                <tbody>
                  {data.topPaths.map((p, i) => (
                    <tr key={i}>
                      <td><code style={{fontFamily:'var(--font-mono)',fontSize:11}}>{p.path}</code></td>
                      <td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{(p.hits||0).toLocaleString()}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{(p.sessions||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Traffic sources · 30d</h3></summary>
            {loading ? <p className="desc">Loading…</p>
             : data.sources.length === 0 ? <p className="desc">No data yet.</p>
             : (
              <table className="apps-table" style={{fontSize:12}}>
                <thead><tr><th>Source</th><th style={{textAlign:'right'}}>Hits</th><th style={{textAlign:'right'}}>Sessions</th></tr></thead>
                <tbody>
                  {data.sources.slice(0,8).map((s, i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{s.source || 'direct'}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{(s.hits||0).toLocaleString()}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{(s.sessions||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>
        </div>

        {/* Content inventory + GDPR */}
        <div className="grid-4" style={{marginBottom:18}}>
          <Stat label="Programs" value={programsCount} accent="#248737" sub="Editable in CMS" onClick={() => setTab('programs')} />
          <Stat label="Partners" value={partnersCount} accent="#248737" sub="Logos & names" onClick={() => setTab('partners')} />
          <Stat label="Stories" value={storiesCount} accent="#248737" sub="Learner testimonials" onClick={() => setTab('stories')} />
          <Stat label="Consents · 30d" value={data.consents} accent="#0094B4" sub="GDPR audit trail" onClick={() => setTab('consent_log')} />
        </div>

        {/* Quick actions */}
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Quick actions</h3></summary>
          <p className="desc">Jump into the things you most often manage.</p>
          <div className="grid-3">
            <Quick id="apps" label="Review applications" icon="clipboard-check" />
            <Quick id="inquiries" label="Read inquiries" icon="mail" />
            <Quick id="members" label="Member directory" icon="users" />
            <Quick id="programs" label="Edit programs" icon="graduation-cap" />
            <Quick id="og_images" label="OG / SEO images" icon="image" />
            <Quick id="errors_copy" label="Error pages" icon="triangle-alert" />
            <Quick id="analytics" label="Analytics deep-dive" icon="chart-column" />
            <Quick id="member_roles" label="Roles & permissions" icon="shield-check" />
            <Quick id="wiki_kms" label="KMS wiki" icon="book-open" />
          </div>
        </details>

        {/* Recent activity — 4 columns */}
        <div className="grid-2">
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Recent applications</h3></summary>
            {loading ? <p className="desc">Loading…</p>
             : recentApps.length === 0 ? <p className="desc">No applications yet.</p>
             : (
              <ul style={{listStyle:'none',margin:0,padding:0}}>
                {recentApps.map(a => (
                  <li key={a.id} style={{padding:'10px 0',borderBottom:'1px solid var(--border-hair)',display:'flex',justifyContent:'space-between',gap:12}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14}}>{a.name || '—'}</div>
                      <div style={{fontSize:12,color:'var(--fg-muted)'}}>{a.program || '—'} · {a.country || '—'}</div>
                    </div>
                    <div style={{fontSize:11,color:'var(--fg-muted)',whiteSpace:'nowrap'}}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : ''}</div>
                  </li>
                ))}
              </ul>
            )}
            <div style={{textAlign:'right',marginTop:8}}>
              <button type="button" className="icon-btn" onClick={() => setTab('apps')}>View all →</button>
            </div>
          </details>
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Recent inquiries</h3></summary>
            {loading ? <p className="desc">Loading…</p>
             : recentInq.length === 0 ? <p className="desc">No inquiries yet.</p>
             : (
              <ul style={{listStyle:'none',margin:0,padding:0}}>
                {recentInq.map(i => (
                  <li key={i.id} style={{padding:'10px 0',borderBottom:'1px solid var(--border-hair)'}}>
                    <div style={{fontWeight:600,fontSize:13}}>{i.subject || i.topic || '—'}</div>
                    <div style={{fontSize:12,color:'var(--fg-muted)'}}>{i.email || '—'} · {i.created_at ? new Date(i.created_at).toLocaleString() : ''}</div>
                  </li>
                ))}
              </ul>
            )}
            <div style={{textAlign:'right',marginTop:8}}>
              <button type="button" className="icon-btn" onClick={() => setTab('inquiries')}>View all →</button>
            </div>
          </details>
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Newest members</h3></summary>
            {loading ? <p className="desc">Loading…</p>
             : recentMembers.length === 0 ? <p className="desc">No members yet.</p>
             : (
              <ul style={{listStyle:'none',margin:0,padding:0}}>
                {recentMembers.map(m => (
                  <li key={m.id} style={{padding:'10px 0',borderBottom:'1px solid var(--border-hair)',display:'flex',justifyContent:'space-between',gap:12}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{m.name || m.email}</div>
                      <div style={{fontSize:11,color:'var(--fg-muted)'}}>{m.role} · {m.email}</div>
                    </div>
                    <div style={{fontSize:11,color:'var(--fg-muted)',whiteSpace:'nowrap'}}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}</div>
                  </li>
                ))}
              </ul>
            )}
            <div style={{textAlign:'right',marginTop:8}}>
              <button type="button" className="icon-btn" onClick={() => setTab('members')}>View all →</button>
            </div>
          </details>
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Recent error logs</h3></summary>
            {loading ? <p className="desc">Loading…</p>
             : recentErrors.length === 0 ? <p className="desc" style={{color:'var(--forest-green)'}}>✓ No errors logged.</p>
             : (
              <ul style={{listStyle:'none',margin:0,padding:0}}>
                {recentErrors.map(e => (
                  <li key={e.id} style={{padding:'10px 0',borderBottom:'1px solid var(--border-hair)'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--state-danger)'}}>{e.message || e.status || 'Error'}</div>
                    <div style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{e.path || ''} · {e.created_at ? new Date(e.created_at).toLocaleString() : ''}</div>
                  </li>
                ))}
              </ul>
            )}
            <div style={{textAlign:'right',marginTop:8}}>
              <button type="button" className="icon-btn" onClick={() => setTab('error_logs')}>View all →</button>
            </div>
          </details>
        </div>
      </>
    );
  }

  // ---- Account link picker (team member ↔ registered account) -------------
  // Searches /api/admin/users and links the selected account to a team
  // member so /team messages reach that person's inbox (v01.073). A stable
  // opaque `key` is generated on first link — it's what the public page uses
  // to address the message (the real user_id is never exposed publicly).
  function genTeamKey() {
    try { if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replace(/-/g, '').slice(0, 12); } catch {}
    return (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 12);
  }
  function AccountLinkField({ userId, userLabel, onLink, onUnlink }) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    async function search(term) {
      setQ(term);
      if (!term || term.trim().length < 2) { setResults([]); setOpen(false); return; }
      setBusy(true);
      try {
        const tok = adminToken();
        const r = await fetch('/api/admin/account-search?q=' + encodeURIComponent(term.trim()), { headers: authHeaders() });
        const d = await r.json();
        setResults(d.items || []); setOpen(true);
      } catch {} finally { setBusy(false); }
    }
    return (
      <div className="field">
        <label>Linked account · 메시지 받을 계정</label>
        {userId ? (
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--state-success-bg)',border:'1px solid var(--border-subtle)',borderRadius:10}}>
            <span style={{fontSize:13,color:'var(--fg-primary)'}}>{userLabel || userId}</span>
            <button type="button" className="icon-btn danger" style={{marginLeft:'auto'}} onClick={onUnlink}>연결 해제</button>
          </div>
        ) : (
          <div style={{position:'relative'}}>
            <input type="text" placeholder="이름 또는 이메일로 가입 회원 검색…" value={q}
              onChange={e => search(e.target.value)} onFocus={() => results.length && setOpen(true)} />
            {busy && <span className="hint">검색 중…</span>}
            {open && results.length > 0 && (
              <ul style={{position:'absolute',zIndex:20,left:0,right:0,margin:'4px 0 0',padding:6,listStyle:'none',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:10,boxShadow:'var(--shadow-md)',maxHeight:220,overflowY:'auto'}}>
                {results.map(u => (
                  <li key={u.id}>
                    <button type="button" style={{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',border:0,background:'transparent',borderRadius:8,cursor:'pointer'}}
                      onClick={() => { onLink(u); setOpen(false); setQ(''); setResults([]); }}>
                      <strong style={{fontSize:13}}>{u.name || '(이름 없음)'}</strong>
                      <span style={{display:'block',fontSize:12,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{u.email} · {u.role}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <span className="hint">메시지를 받을 가입 계정을 연결하세요. 연결해야 /team에서 이 사람에게 메시지를 보낼 수 있습니다(미연결 시 버튼 숨김).</span>
      </div>
    );
  }

  // ---- Project team page --------------------------------------------------
  // 공개 /team 페이지는 영어 전용이므로 콘텐츠 입력은 EN 필드만 둔다 (관리자
  // UI 라벨은 한국어 유지 — 운영자가 한국인). 데이터는 영어 변수(name_en /
  // role_en / bio_en / kicker_en)에 저장하고, 공개 페이지가 그대로 읽는다.
  function TeamAdminTab({ c, set, addItem, removeItem }) {
    const pt = c.project_team || {};
    const sections = pt.sections || [];
    const cta = pt.cta || {};
    const coord = pt.coordinator || {};
    // Reorder helpers (array splice → set). Used by the ↑/↓ buttons on
    // sections and members.
    const moveSection = (from, to) => {
      if (to < 0 || to >= sections.length) return;
      const arr = [...sections];
      const [x] = arr.splice(from, 1); arr.splice(to, 0, x);
      set(['project_team','sections'], arr);
    };
    const moveMember = (si, from, to) => {
      const arr = [...((sections[si] && sections[si].members) || [])];
      if (to < 0 || to >= arr.length) return;
      const [x] = arr.splice(from, 1); arr.splice(to, 0, x);
      set(['project_team','sections', si, 'members'], arr);
    };
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Hero (top of /team page)</h3></summary>
          <p className="desc" style={{marginTop:-4}}>공개 사이트는 영어 전용입니다 — 영어로만 입력하세요.</p>
          <div className="grid-2 tight">
            <Text label="Kicker" value={pt.hero?.en?.kicker || ''} onChange={v => set(['project_team','hero','en','kicker'], v)} lang="en" />
            <Text label="Title L1" value={pt.hero?.en?.title_l1 || ''} onChange={v => set(['project_team','hero','en','title_l1'], v)} lang="en" />
            <Text label="Title L2" value={pt.hero?.en?.title_l2 || ''} onChange={v => set(['project_team','hero','en','title_l2'], v)} lang="en" />
            <Area label="Subtitle" value={pt.hero?.en?.sub || ''} onChange={v => set(['project_team','hero','en','sub'], v)} lang="en" />
          </div>
        </details>
        <HeroBgFields title="팀 히어로 배경" path={['project_team','hero']} node={pt.hero} set={set} />

        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>상단 메시지 밴드 (Meet our CEO)</h3></summary>
          <p className="desc" style={{marginTop:-4}}>/team 상단 메시지 밴드 문구. 비우면 기본 문구가 표시됩니다.</p>
          <div className="grid-2 tight">
            <Text label="Kicker" value={(pt.coord_cta && pt.coord_cta.kicker_en) || ''} onChange={v => set(['project_team','coord_cta','kicker_en'], v)} lang="en" />
            <Text label="Title" value={(pt.coord_cta && pt.coord_cta.title_en) || ''} onChange={v => set(['project_team','coord_cta','title_en'], v)} lang="en" />
          </div>
          <Area label="Subtitle" value={(pt.coord_cta && pt.coord_cta.sub_en) || ''} onChange={v => set(['project_team','coord_cta','sub_en'], v)} lang="en" rows={3} />
        
          <div style={{margin:'18px 0 6px',paddingTop:14,borderTop:'1px solid var(--border-subtle)',fontSize:12,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--fg-muted)'}}>메시지를 받을 코디네이터 (수신자)</div>
          <p className="desc" style={{marginTop:-4}}>
            공개 /team 페이지 상단의 <strong>“Message our coordinator”</strong> 상시 버튼이
            가리키는 사람입니다. <strong>아래 팀원 중에서 지정</strong>하면 이름·직함·사진·연결계정이
            그 팀원과 <strong>자동으로 동기화</strong>됩니다(중복 입력 불필요). 또는 팀원이 아닌 사람을
            직접 입력할 수도 있습니다.
          </p>
          {(() => {
            const all = [];
            sections.forEach((s, si) => (s.members || []).forEach((m, mi) =>
              all.push({ si, mi, m, label: (m.name_en || m.name || '(이름 없음)') + ' — ' + (s.kicker_en || s.kicker_ko || `Group ${si + 1}`) })));
            const desigKey = coord.member_key || '';
            const cur = desigKey ? (() => { const f = all.find(x => x.m.key === desigKey); return f ? (f.si + ':' + f.mi) : ''; })() : '';
            const desigMember = desigKey ? (all.find(x => x.m.key === desigKey) || null) : null;
            function pick(val) {
              if (!val) { const { member_key, ...rest } = coord; set(['project_team','coordinator'], rest); return; }
              const [si, mi] = val.split(':').map(Number);
              const m = (sections[si] && sections[si].members && sections[si].members[mi]) || null;
              if (!m) return;
              let key = m.key;
              if (!key) { key = genTeamKey(); set(['project_team','sections',si,'members',mi], { ...m, key }); }
              set(['project_team','coordinator'], { member_key: key });
            }
            return (
              <>
                <div className="field">
                  <label>코디네이터 지정 · Designate from team member</label>
                  <select value={cur} onChange={e => pick(e.target.value)}>
                    <option value="">— 직접 입력 (팀원 아님) —</option>
                    {all.map(x => <option key={x.si + ':' + x.mi} value={x.si + ':' + x.mi}>{x.label}</option>)}
                  </select>
                  <span className="hint">팀원을 고르면 그 사람이 곧 코디네이터가 되고, 메시지는 그 팀원에 연결된 계정으로 갑니다.</span>
                </div>
                {desigKey ? (
                  <div style={{padding:'10px 14px',background:'var(--state-success-bg)',border:'1px solid var(--border-subtle)',borderRadius:10}}>
                    <p className="desc" style={{margin:0}}>
                      이 코디네이터는 팀원 <strong>{desigMember ? (desigMember.m.name_en || desigMember.m.name || '(이름 없음)') : '(찾을 수 없음)'}</strong> 와(과)
                      자동 동기화됩니다. 이름·직함·사진·연결계정은 아래 <strong>Sections</strong>의 해당 팀원 카드에서 수정하세요.
                      {desigMember && !desigMember.m.user_id && (
                        <span style={{display:'block',marginTop:6,color:'var(--state-danger)'}}>
                          이 팀원에 아직 가입 계정이 연결되지 않았습니다 — 연결해야 회원 메시지가 그 사람의 메시지함으로 도착합니다(미연결 시 문의함으로 fallback).
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid-2 tight">
                      <Text label="Name" value={coord.name_en || ''} onChange={v => set(['project_team','coordinator','name_en'], v)} lang="en" />
                      <Text label="Role / title" value={coord.role_en || ''} onChange={v => set(['project_team','coordinator','role_en'], v)} lang="en" />
                    </div>
                    <ImageUploadField
                      label="Photo / 사진 (JPG·PNG·WebP)"
                      value={coord.image || ''}
                      onChange={v => set(['project_team','coordinator','image'], v)}
                      accept="image/png,image/jpeg,image/webp"
                      preview="square"
                      hint="정사각 프레임에 cover로 표시됩니다. 아래 슬라이더로 위치 조정."
                    />
                    <PhotoPos img={coord.image} value={coord.photo_pos} onChange={v => set(['project_team','coordinator','photo_pos'], v)} />
                    <AccountLinkField
                      userId={coord.user_id} userLabel={coord.user_label}
                      onLink={u => set(['project_team','coordinator'], { ...coord, user_id: u.id, user_label: (u.name ? u.name + ' · ' : '') + u.email, key: coord.key || genTeamKey() })}
                      onUnlink={() => set(['project_team','coordinator'], { ...coord, user_id: undefined, user_label: undefined })}
                    />
                  </>
                )}
              </>
            );
          })()}
        </details>

        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Sections</h3></summary>
          <p className="desc" style={{marginTop:-4}}>
            그룹(예: <code>HQ</code>, <code>GLOBAL TEAM</code>)별로 섹션을 만들고 멤버를 추가하세요.
            각 섹션 제목이 공개 /team 페이지의 그룹 헤딩으로 표시됩니다. 멤버마다
            <strong> 가입 계정을 연결</strong>하면 그 사람에게 직접 메시지를 받을 수 있습니다
            (미연결 시 메시지 버튼 숨김). 사진은 1:1이 아니면 자동으로 정사각형으로 잘립니다.
            영어로만 입력하세요.
          </p>
          {sections.map((s, si) => (
            <div className="rep-item" key={si}>
              <div className="rep-head">
                <strong>Section {si + 1}{s.kicker_en ? ' · ' + s.kicker_en : ''}</strong>
                <div className="ctrls">
                  <button type="button" className="icon-btn" disabled={si === 0} title="위로" onClick={() => moveSection(si, si - 1)}>↑</button>
                  <button type="button" className="icon-btn" disabled={si === sections.length - 1} title="아래로" onClick={() => moveSection(si, si + 1)}>↓</button>
                  <button className="icon-btn danger" onClick={() => removeItem(['project_team','sections'], si)}>Delete section</button>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <Text label="Group title (e.g. HQ, GLOBAL TEAM)" value={s.kicker_en || s.kicker_ko || ''} onChange={v => set(['project_team','sections',si,'kicker_en'], v)} lang="en" />
              </div>
              <h4 style={{margin:'8px 0',fontSize:13,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--fg-secondary)'}}>Members</h4>
              {(s.members || []).map((m, mi) => {
                // Collapsed-by-default accordion keyed by name (native <details>,
                // so open state is DOM-managed and survives re-render).
                const mName = m.name_en || m.name || `Member ${mi + 1}`;
                return (
                <details key={mi} className="team-admin-member" style={{background:'var(--bg-elevated)',borderRadius:10,marginBottom:10,border:'1px solid var(--border-subtle)'}} open>
                  <summary style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer',listStyle:'none',userSelect:'none'}}>
                    {/* chevron = explicit 펼치기/접기 버튼. Part of summary so it
                        toggles; rotates via CSS on [open]. Name click also toggles. */}
                    <span className="tm-chevron" aria-hidden="true">▶</span>
                    <strong style={{fontSize:14,color:'var(--fg-primary)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{mName}</strong>
                    <button type="button" className="icon-btn" disabled={mi === 0} title="위로"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveMember(si, mi, mi - 1); }}>↑</button>
                    <button type="button" className="icon-btn" disabled={mi === (s.members || []).length - 1} title="아래로"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveMember(si, mi, mi + 1); }}>↓</button>
                    <button className="icon-btn danger" onClick={(e) => {
                      e.stopPropagation(); e.preventDefault();
                      if (!confirm(`Remove ${mName}?`)) return;
                      const next = (s.members || []).filter((_, j) => j !== mi);
                      set(['project_team','sections',si,'members'], next);
                    }}>Remove</button>
                  </summary>
                  <div style={{padding:'0 14px 14px'}}>
                    <ImageUploadField
                      label="사진 / Photo (JPG·PNG·WebP)"
                      value={m.image || ''}
                      onChange={v => set(['project_team','sections',si,'members',mi,'image'], v)}
                      accept="image/png,image/jpeg,image/webp"
                      preview="square"
                      hint="정사각 프레임에 cover로 표시됩니다. 아래 슬라이더로 보일 위치를 조정하세요."
                    />
                    <PhotoPos img={m.image} value={m.photo_pos} onChange={v => set(['project_team','sections',si,'members',mi,'photo_pos'], v)} />
                    <div className="grid-2 tight">
                      <Text label="Name" value={m.name_en || m.name || ''} onChange={v => set(['project_team','sections',si,'members',mi,'name_en'], v)} lang="en" />
                      <Text label="Role / title" value={m.role_en || m.role_ko || ''} onChange={v => set(['project_team','sections',si,'members',mi,'role_en'], v)} lang="en" />
                    </div>
                    <div style={{margin:'4px 0 8px',fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--fg-muted)',fontWeight:700}}>클릭 시 모달 내용</div>
                    <Area label="BIO 문구 (카드 요약 겸 모달 상단)" value={m.bio_en || m.bio_ko || ''} onChange={v => set(['project_team','sections',si,'members',mi,'bio_en'], v)} lang="en" hint="카드에 보이는 짧은 한 줄 소개 + 모달 맨 위 BIO." />
                    <Area label="주요 약력 / Key background" value={m.career_en || m.career_ko || ''} onChange={v => set(['project_team','sections',si,'members',mi,'career_en'], v)} lang="en" rows={5} hint="경력·학력 등 주요 약력. 줄바꿈 가능." />
                    <Area label="주요 프로젝트 역할 / Role in this project" value={m.project_role_en || m.project_role_ko || ''} onChange={v => set(['project_team','sections',si,'members',mi,'project_role_en'], v)} lang="en" rows={4} hint="KoreaDreamPath에서 맡은 주요 역할. 줄바꿈 가능." />
                    <Area label="CREDENTIALS / 자격·학위" value={m.credentials_en || m.credentials_ko || ''} onChange={v => set(['project_team','sections',si,'members',mi,'credentials_en'], v)} lang="en" rows={3} hint="학위·자격증·인증 등. 한 줄에 하나씩." />
                    <Area label="주요 링크 / Key links" value={m.links_en || m.links_ko || ''} onChange={v => set(['project_team','sections',si,'members',mi,'links_en'], v)} lang="en" rows={3} hint="한 줄에 하나씩. 'LinkedIn | https://…' 처럼 '라벨 | URL' 형식 가능(라벨 생략 시 URL 표시)." />
                    <Text label="연락처 (이메일) / Contact email" value={m.contact_email || ''} onChange={v => set(['project_team','sections',si,'members',mi,'contact_email'], v)} lang="en" hint="모달에 메일 링크로 표시됩니다." />
                    <AccountLinkField
                      userId={m.user_id} userLabel={m.user_label}
                      onLink={u => set(['project_team','sections',si,'members',mi], { ...m, user_id: u.id, user_label: (u.name ? u.name + ' · ' : '') + u.email, key: m.key || genTeamKey() })}
                      onUnlink={() => set(['project_team','sections',si,'members',mi], { ...m, user_id: undefined, user_label: undefined })}
                    />
                  </div>
                </details>
                );
              })}
              <button className="btn-add" onClick={() => {
                const next = [...(s.members || []), { name_en:'', role_en:'', bio_en:'', image:'' }];
                set(['project_team','sections',si,'members'], next);
              }}>+ Add member</button>
            </div>
          ))}
          <button className="btn-add" onClick={() => addItem(['project_team','sections'], { kicker_en:'NEW GROUP', members:[] })}>+ Add section</button>
        </details>

        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Join CTA</h3></summary>
          <p className="desc" style={{marginTop:-4}}>영어로만 입력하세요.</p>
          <div className="grid-2 tight">
            <Text label="Kicker" value={cta.en?.kicker || ''} onChange={v => set(['project_team','cta','en','kicker'], v)} lang="en" />
            <Text label="Title" value={cta.en?.title || ''} onChange={v => set(['project_team','cta','en','title'], v)} lang="en" />
            <Area label="Sub" value={cta.en?.sub || ''} onChange={v => set(['project_team','cta','en','sub'], v)} lang="en" />
            <Text label="Button" value={cta.en?.button || ''} onChange={v => set(['project_team','cta','en','button'], v)} lang="en" />
            <Text label="Email" value={cta.en?.email || ''} onChange={v => set(['project_team','cta','en','email'], v)} />
          </div>
        </details>
      </>
    );
  }

  // ---- About page ---------------------------------------------------------
  // About page editor.
  // NOTE: team-related fields used to live here (c.about.team.* / c.about.team.cards[])
  // but team content moved to its own /team page (Pages → Project team, c.project_team).
  // Those legacy fields were removed from this tab on 2026-05-04 to stop confusing
  // operators with knobs that no longer rendered anywhere.
  // About page editor — Executive Summary structure (c.about.exec).
  // Hero on top, four content blocks (kicker + heading + bullet items),
  // and a closing strategic-value section. Each block's items are stored
  // as parallel ko/en arrays so adding a bullet adds one to both.
  function AboutTab({ c, set, addItem, removeItem }) {
    const ex = (c.about && c.about.exec) || {};
    const blocks = Array.isArray(ex.blocks) ? ex.blocks : [];

    function addBlock() {
      addItem(['about','exec','blocks'], {
        kicker_ko: '새 섹션', kicker_en: 'NEW SECTION',
        heading_ko: '제목', heading_en: 'Heading',
        items_ko: [], items_en: [],
      });
    }
    function moveBlock(from, to) {
      if (to < 0 || to >= blocks.length) return;
      const next = blocks.slice();
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      set(['about','exec','blocks'], next);
    }
    function addItemToBoth(bi) {
      const b = blocks[bi];
      set(['about','exec','blocks',bi,'items_ko'], [...(b.items_ko || []), '새 항목']);
      set(['about','exec','blocks',bi,'items_en'], [...(b.items_en || []), 'New item']);
    }
    function removeRow(bi, ri) {
      const b = blocks[bi];
      set(['about','exec','blocks',bi,'items_ko'], (b.items_ko || []).filter((_, i) => i !== ri));
      set(['about','exec','blocks',bi,'items_en'], (b.items_en || []).filter((_, i) => i !== ri));
    }
    function setRow(bi, ri, langKey, value) {
      const b = blocks[bi];
      const arr = (b['items_' + langKey] || []).slice();
      arr[ri] = value;
      set(['about','exec','blocks',bi,'items_' + langKey], arr);
    }

    return (
      <>
        {/* Hero band */}
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Hero (top of About page)</h3></summary>
          <div className="grid-2 tight">
            <Text label="Kicker (EN)" value={ex.hero?.kicker_en || ''} onChange={v => set(['about','exec','hero','kicker_en'], v)} lang="en" />
            <Area label="Title (EN)" value={ex.hero?.title_en || ''} onChange={v => set(['about','exec','hero','title_en'], v)} lang="en" rows={3} hint="Use \\n for line break" />
            <Area label="Body (EN)" value={ex.hero?.body_en || ''} onChange={v => set(['about','exec','hero','body_en'], v)} lang="en" rows={4} />
          </div>
        </details>
        <HeroBgFields title="About 히어로 배경" path={['about','exec','hero']} node={ex.hero} set={set} />

        {/* Content blocks */}
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Content blocks</h3></summary>
          <p className="desc">A grid of cards (default: 정책 정합성 / 핵심 특징 / 기대 효과 / 컴플라이언스). Each block has its own kicker, heading, and bullet list.</p>
          <button type="button" className="btn-add" onClick={addBlock}>+ Add block</button>
        </details>

        {blocks.map((b, bi) => {
          const itemsKo = b.items_ko || [];
          const itemsEn = b.items_en || [];
          const maxLen = Math.max(itemsKo.length, itemsEn.length);
          return (
            <div className="card" key={bi}>
              <div className="rep-head" style={{marginBottom:14}}>
                <strong>Block {bi + 1} — {b.kicker_ko || b.kicker_en}</strong>
                <div className="ctrls">
                  <button type="button" className="icon-btn" onClick={() => moveBlock(bi, bi - 1)} disabled={bi === 0}>↑</button>
                  <button type="button" className="icon-btn" onClick={() => moveBlock(bi, bi + 1)} disabled={bi === blocks.length - 1}>↓</button>
                  <button type="button" className="icon-btn danger" onClick={() => { if (confirm('Delete this block?')) removeItem(['about','exec','blocks'], bi); }}>Delete block</button>
                </div>
              </div>
              <div className="grid-2 tight">
                <Text label="Kicker (EN)" value={b.kicker_en || ''} onChange={v => set(['about','exec','blocks',bi,'kicker_en'], v)} lang="en" />
                <Text label="Heading (EN)" value={b.heading_en || ''} onChange={v => set(['about','exec','blocks',bi,'heading_en'], v)} lang="en" />
              </div>
              <div className="app-sec" style={{marginTop:18}}>Bullet list ({maxLen})</div>
              {Array.from({ length: maxLen }).map((_, ri) => (
                <div className="rep-item" key={ri} style={{padding:'12px 14px'}}>
                  <div className="rep-head">
                    <strong>· {ri + 1}</strong>
                    <button type="button" className="icon-btn danger" onClick={() => removeRow(bi, ri)}>Remove</button>
                  </div>
                  <div className="grid-2 tight">
                    <Text label="EN" value={itemsEn[ri] || ''} onChange={v => setRow(bi, ri, 'en', v)} lang="en" />
                  </div>
                </div>
              ))}
              <button type="button" className="btn-add" onClick={() => addItemToBoth(bi)}>+ Add bullet</button>
            </div>
          );
        })}

        {/* Closing strategic-value band */}
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Closing — Strategic Value</h3></summary>
          <p className="desc">The grey panel at the bottom of /about. One kicker + one big title + one body paragraph.</p>
          <div className="grid-2 tight">
            <Text label="Kicker (EN)" value={ex.closing?.kicker_en || ''} onChange={v => set(['about','exec','closing','kicker_en'], v)} lang="en" />
            <Area label="Title (EN)" value={ex.closing?.title_en || ''} onChange={v => set(['about','exec','closing','title_en'], v)} lang="en" rows={3} hint="Use \\n for line break" />
            <Area label="Body (EN)" value={ex.closing?.body_en || ''} onChange={v => set(['about','exec','closing','body_en'], v)} lang="en" rows={3} />
          </div>
        </details>
      </>
    );
  }

  // ---- Page heros (Partners / Stories / News / Contact / Programs) -------
  function MenuNamesTab({ c, set }) {
    const nav = (c.nav && c.nav.en) || {};
    const navOrder = ['about','programs','scholarships','news','stories','partners','contact','apply'];
    const cols = (c.footer && c.footer.columns) || [];
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{marginTop:0}}>상단 메뉴 이름 (Top navigation)</h3></summary>
          <p className="desc" style={{marginTop:-4}}>공개 사이트 상단 네비게이션 메뉴 이름입니다(영어).</p>
          <div className="grid-2 tight">
            {navOrder.map(k => <Text key={k} label={k} value={nav[k] || ''} onChange={v => set(['nav','en',k], v)} lang="en" />)}
          </div>
        </details>
        {cols.map((col, ci) => (
          <details key={ci} className="card admin-fold" open>
            <summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:0,display:'inline',fontSize:'inherit'}}>푸터 메뉴: {col.title_en || ('Column ' + (ci+1))}</h3></summary>
            <div style={{marginTop:12}}>
              <Text label="컬럼 제목 (Column title)" value={col.title_en || ''} onChange={v => set(['footer','columns',ci,'title_en'], v)} lang="en" />
              {(col.items || []).map((it, ii) => (
                <Text key={ii} label={'항목 ' + (ii+1)} value={it.label_en || ''} onChange={v => set(['footer','columns',ci,'items',ii,'label_en'], v)} lang="en" />
              ))}
            </div>
          </details>
        ))}
      </>
    );
  }
  function ApplyHeroTab({ c, set }) {
    const g = (c && c.apply_gate) || {};
    const closed = g.closed !== false;   // 기본값은 '중단' (content-store 기본과 일치)
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>신청 접수 상태 <span style={{fontSize:12,fontWeight:700,marginLeft:8,padding:'2px 10px',borderRadius:999,background: closed ? 'var(--state-danger-bg)' : 'var(--state-success-bg)',color: closed ? 'var(--state-danger)' : 'var(--state-success)'}}>{closed ? '접수 중단' : '접수 중'}</span></h3></summary>
          <p style={{fontSize:13,color:'var(--fg-muted)',margin:'4px 0 14px',lineHeight:1.7}}>
            체크하면 <strong>지원 폼이 안내 화면으로 바뀌고</strong>, 서버도 신청 관련 제출을 모두 거절합니다
            (신규 지원서 · 지원서 파일 업로드 · 마이페이지의 접수번호/합격증/서류/결제 제출).
            이미 제출된 신청 내역과 관리자 검토는 영향받지 않습니다.
          </p>
          <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,fontSize:14,fontWeight:600}}>
            <input type="checkbox" checked={closed} onChange={e => set(['apply_gate','closed'], e.target.checked)} />
            신청 접수 중단 (체크 해제 = 접수 재개)
          </label>
          <div className="grid-2 tight">
            <Text label="안내 제목 (KO)" value={g.title_ko} onChange={v => set(['apply_gate','title_ko'], v)} lang="ko" />
            <Text label="안내 제목 (EN)" value={g.title_en} onChange={v => set(['apply_gate','title_en'], v)} lang="en" />
            <Area label="안내 본문 (KO)" value={g.body_ko} onChange={v => set(['apply_gate','body_ko'], v)} rows={4} lang="ko" />
            <Area label="안내 본문 (EN)" value={g.body_en} onChange={v => set(['apply_gate','body_en'], v)} rows={4} lang="en" />
          </div>
        </details>
        <PageHeroText c={c} set={set} pageKey="apply" label="지원 폼 히어로 (헤더)" />
      </>
    );
  }
  function ApplyDoneTab({ c, set }) { return <PageHeroText c={c} set={set} pageKey="apply_done" label="지원 완료 히어로 (헤더)" />; }
  function MyPageHeroTab({ c, set }) { return (<><PageHeroText c={c} set={set} pageKey="member" label="회원 로그인 안내 히어로 (헤더)" /><PageHeroText c={c} set={set} pageKey="mypage" label="마이페이지 히어로 (헤더)" /></>); }
  // Scholarships = a BOARD (게시판) the operator posts to. Like News, the posts
  // live in D1 (scholarship_posts via /api/scholarships) and are created/edited/
  // deleted on the public /scholarships page while signed in as an admin. This
  // console tab only edits the page header + the optional intro note; the
  // post-management itself is a deep-link to the live page.
  function ScholarshipsTab({ c, set }) {
    const s = c.scholarships || {};
    return (
      <>
        <PageHeroText c={c} set={set} pageKey="scholarships" label="장학 페이지 히어로 (헤더)" />
        <details className="card admin-fold" open>
          <summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:0,display:'inline',fontSize:'inherit'}}>안내문 (상단 배너 · 선택)</h3></summary>
          <div style={{marginTop:12}}>
            <Area label="Intro note (영어)" value={(s.intro && s.intro.en) || ''} onChange={v => set(['scholarships','intro','en'], v)} lang="en" rows={3}
              hint="장학 게시판 상단에 표시되는 안내 문구입니다. 비우면 배너가 숨겨집니다." />
          </div>
        </details>
        <details className="card admin-fold" open>
          <summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:0,display:'inline',fontSize:'inherit'}}>장학 정보 관리 (게시판)</h3></summary>
          <div style={{marginTop:12}}>
            <p style={{margin:'0 0 14px',fontSize:14,color:'var(--fg-secondary)',lineHeight:1.6}}>
              장학 정보는 D1 데이터베이스에 저장됩니다. 등록·수정·삭제는 공개 /scholarships 페이지에서{' '}
              관리자로 로그인한 상태로 직접 진행합니다. 목록에서 항목을 누르면 우리 사이트 안의{' '}
              상세 페이지(/scholarship/:id)로 이동합니다. 필드: 장학금 명칭 · 주최기관 · 분류
              (Government / University / Private · Foundation) · 접수기간 · 대표 이미지 · 내용 ·
              세부 정보(장학자격·범위 등 자유 항목) · 주요내용 · 신청 링크. (헤더·안내문은 위에서 편집)
            </p>
            <a className="btn btn-primary btn-sm" href="/scholarships" target="_blank" rel="noopener">
              /scholarships 페이지 열기 ↗
            </a>
          </div>
        </details>
      </>
    );
  }
  function PageHerosTab({ c, set }) {
    // Pages WITHOUT their own content tab. (Partners/Stories/News/Contact-FAQ/
    // Programs heros now live in their own tabs.) EN only — public is English.
    const pages = [
      { key: 'apply',        label: '지원 폼 (Apply)' },
      { key: 'apply_done',   label: '지원 완료 (Apply complete)' },
      { key: 'member',       label: '회원 로그인 안내 (Members only)' },
      { key: 'mypage',       label: '마이페이지 (My page)' },
      { key: 'scholarships', label: '장학 (Scholarships)' },
    ];
    return (
      <>
        <div className="card" style={{padding:'12px 14px',background:'var(--bg-muted)',border:'1px solid var(--border-subtle)'}}>
          <p style={{margin:0,fontSize:13,color:'var(--fg-secondary)'}}>전용 탭이 없는 페이지들의 히어로(헤더)입니다. 파트너·스토리·소식·문의/FAQ·프로그램 헤더는 각 탭에서 편집합니다.</p>
        </div>
        {pages.map(({ key, label }) => (
          <PageHeroText key={key} c={c} set={set} pageKey={key} label={label + ' 히어로'} />
        ))}
      </>
    );
  }

  // ---- Program detail (shared copy across all program pages) -------------
  function ProgramDetailTab({ c, set }) {
    const d = c.program_detail || {};
    const ko = d.ko || {}, en = d.en || {};
    const koItems = (ko.learn_items || []).join('\n');
    const enItems = (en.learn_items || []).join('\n');
    const setItems = (langKey, raw) => {
      const arr = raw.split('\n').map(s => s.trim()).filter(Boolean);
      set(['program_detail', langKey, 'learn_items'], arr);
    };
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>프로그램 상세 본문 (공통 카피)</h3></summary>
          <Text label="Back link" value={en.back_link || ''} onChange={v => set(['program_detail','en','back_link'], v)} lang="en" />
          <Text label="Overview heading" value={en.overview_h || ''} onChange={v => set(['program_detail','en','overview_h'], v)} lang="en" />
          <Area label="Overview body" value={en.overview_body || ''} onChange={v => set(['program_detail','en','overview_body'], v)} lang="en" rows={4} />
          <Text label="What you'll learn — heading" value={en.learn_h || ''} onChange={v => set(['program_detail','en','learn_h'], v)} lang="en" />
          <Area label="Learn items (one per line)" value={enItems} onChange={v => setItems('en', v)} lang="en" rows={4} />
          <Text label="Eligibility heading" value={en.eligibility_h || ''} onChange={v => set(['program_detail','en','eligibility_h'], v)} lang="en" />
          <Area label="Eligibility body" value={en.eligibility_body || ''} onChange={v => set(['program_detail','en','eligibility_body'], v)} lang="en" rows={3} />
          <Text label="Sidebar info kicker" value={en.info_kicker || ''} onChange={v => set(['program_detail','en','info_kicker'], v)} lang="en" />
          <div className="grid-2 tight">
            <Text label="Length label" value={en.label_length || ''} onChange={v => set(['program_detail','en','label_length'], v)} lang="en" />
            <Text label="Format label" value={en.label_format || ''} onChange={v => set(['program_detail','en','label_format'], v)} lang="en" />
            <Text label="Language label" value={en.label_language || ''} onChange={v => set(['program_detail','en','label_language'], v)} lang="en" />
            <Text label="Level label" value={en.label_level || ''} onChange={v => set(['program_detail','en','label_level'], v)} lang="en" />
            <Text label="Status label" value={en.label_status || ''} onChange={v => set(['program_detail','en','label_status'], v)} lang="en" />
            <Text label="Apply CTA" value={en.apply_cta || ''} onChange={v => set(['program_detail','en','apply_cta'], v)} lang="en" />
          </div>
        </details>
      </>
    );
  }

  // ---- Footer -------------------------------------------------------------
  // ---- Footer editor ------------------------------------------------------
  // Authors the columns and items rendered by Footer.jsx. Operators add /
  // delete / reorder columns and items, set per-item icon (Lucide) and
  // navigation target (SPA view, external URL, or email).
  function FooterTab({ c, set, addItem, removeItem }) {
    const f = c.footer || {};
    const columns = Array.isArray(f.columns) ? f.columns : [];

    // SPA view ids the operator can pick from for kind='view' items.
    const VIEW_OPTIONS = [
      'home','about','programs','scholarships','apply','partners','stories','news','contact','team','member','receipt',
    ];

    function addColumn() {
      addItem(['footer','columns'], {
        id: 'col_' + Date.now().toString(36),
        title_ko: '새 컬럼', title_en: 'New column',
        items: [],
      });
    }
    function moveCol(from, to) {
      if (to < 0 || to >= columns.length) return;
      const next = columns.slice();
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      set(['footer','columns'], next);
    }
    function moveItem(ci, from, to) {
      const items = (columns[ci].items || []).slice();
      if (to < 0 || to >= items.length) return;
      const [m] = items.splice(from, 1);
      items.splice(to, 0, m);
      set(['footer','columns',ci,'items'], items);
    }
    function addRow(ci) {
      addItem(['footer','columns',ci,'items'], {
        label_ko: '새 항목', label_en: 'New item', icon: 'arrow-right',
        kind: 'view', target: 'home',
      });
    }

    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Footer columns</h3></summary>
          <p className="desc">
            Each column shows a heading and a list of items rendered in the public-site footer.
            Items can navigate within the SPA (<code>view</code>), open an external URL, or trigger
            a <code>mailto:</code>. Pick a Lucide icon to display next to the label.
          </p>
          <div className="grid-2 tight">
            <Text label="© line (EN)" value={f.en?.rights || ''} onChange={v => set(['footer','en','rights'], v)} lang="en" />
          </div>
          <div style={{marginTop:14}}>
            <button type="button" className="btn-add" onClick={addColumn}>+ Add column</button>
          </div>
        </details>

        {columns.length === 0 && (
          <div className="card" style={{textAlign:'center',color:'var(--fg-muted)',padding:32}}>
            No columns yet. Add one to start building the footer.
          </div>
        )}

        {columns.map((col, ci) => (
          <div className="card" key={col.id || ci}>
            <div className="rep-head" style={{marginBottom:14}}>
              <strong>Column {ci + 1} · <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-muted)'}}>{col.id || '—'}</span></strong>
              <div className="ctrls">
                <button type="button" className="icon-btn" onClick={() => moveCol(ci, ci - 1)} disabled={ci === 0} title="Move up">↑</button>
                <button type="button" className="icon-btn" onClick={() => moveCol(ci, ci + 1)} disabled={ci === columns.length - 1} title="Move down">↓</button>
                <button type="button" className="icon-btn danger" onClick={() => { if (confirm('Delete this column?')) removeItem(['footer','columns'], ci); }}>Delete column</button>
              </div>
            </div>
            <div className="grid-3 tight">
              <Text label="Slug (id)" value={col.id || ''} onChange={v => set(['footer','columns',ci,'id'], v)} hint="machine-readable, no spaces" />
              <Text label="Title (EN)" value={col.title_en || ''} onChange={v => set(['footer','columns',ci,'title_en'], v)} lang="en" />
            </div>

            <div className="app-sec" style={{marginTop:18}}>Items ({(col.items || []).length})</div>
            {(col.items || []).map((it, ii) => (
              <div className="rep-item" key={ii}>
                <div className="rep-head">
                  <strong>Item {ii + 1}</strong>
                  <div className="ctrls">
                    <button type="button" className="icon-btn" onClick={() => moveItem(ci, ii, ii - 1)} disabled={ii === 0}>↑</button>
                    <button type="button" className="icon-btn" onClick={() => moveItem(ci, ii, ii + 1)} disabled={ii === (col.items.length - 1)}>↓</button>
                    <button type="button" className="icon-btn danger" onClick={() => removeItem(['footer','columns',ci,'items'], ii)}>Delete</button>
                  </div>
                </div>
                <div className="grid-2 tight">
                  <Text label="Label (EN)" value={it.label_en || ''} onChange={v => set(['footer','columns',ci,'items',ii,'label_en'], v)} lang="en" />
                </div>
                <div className="grid-3 tight" style={{marginTop:10}}>
                  <IconField label="Icon" value={it.icon || ''} onChange={v => set(['footer','columns',ci,'items',ii,'icon'], v)} hint="Lucide icon name" />
                  <div className="field">
                    <label>Kind</label>
                    <select value={it.kind || 'view'} onChange={e => set(['footer','columns',ci,'items',ii,'kind'], e.target.value)}>
                      <option value="view">SPA view (in-app navigation)</option>
                      <option value="url">External URL</option>
                      <option value="email">Email (mailto:)</option>
                      <option value="legal">Legal document (modal)</option>
                    </select>
                  </div>
                  {(() => {
                    const kind = it.kind || 'view';
                    if (kind === 'view') {
                      return (
                        <div className="field">
                          <label>Target view</label>
                          <select value={it.target || ''} onChange={e => set(['footer','columns',ci,'items',ii,'target'], e.target.value)}>
                            <option value="">— choose —</option>
                            {VIEW_OPTIONS.map(v => <option key={v} value={v}>/{v === 'home' ? '' : v}</option>)}
                          </select>
                        </div>
                      );
                    }
                    if (kind === 'email') {
                      return <Text label="Email address" value={it.target || ''} onChange={v => set(['footer','columns',ci,'items',ii,'target'], v)} hint="user@example.com" />;
                    }
                    if (kind === 'legal') {
                      const legalKeys = Object.keys((c && c.legal) || {});
                      return (
                        <div className="field">
                          <label>Legal doc slug</label>
                          <select value={it.target || ''} onChange={e => set(['footer','columns',ci,'items',ii,'target'], e.target.value)}>
                            <option value="">— choose —</option>
                            {legalKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                          <span className="hint">Edits to the body live in admin → Setup → Legal documents.</span>
                        </div>
                      );
                    }
                    return <Text label="External URL" value={it.target || ''} onChange={v => set(['footer','columns',ci,'items',ii,'target'], v)} hint="https://…" />;
                  })()}
                </div>
              </div>
            ))}
            <button type="button" className="btn-add" onClick={() => addRow(ci)}>+ Add item</button>
          </div>
        ))}
      </>
    );
  }

  // ---- Wiki (KMS / Design Guide) ----------------------------------------
  // Each wiki is a list of pages. Pages have title, slug, body (HTML from
  // TipTap), and updated_at. Stored as one KV blob per wiki at wiki:<slug>.
  function useWiki(slug) {
    const [data, setData] = useState({ pages: [] });
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/wiki/' + slug);
          const body = await res.json();
          setData((body && body.pages) ? body : { pages: [] });
        } catch (e) { setErr('Load failed: ' + e.message); }
        setLoading(false);
      })();
    }, [slug]);
    async function persist(next) {
      setSaving(true); setErr('');
      try {
        const token = adminToken();
        const res = await fetch('/api/wiki/' + slug, {
          method: 'PUT',
          headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error('http_' + res.status);
        setData(next);
      } catch (e) { setErr('Save failed: ' + e.message); }
      setSaving(false);
    }
    return { data, setData: persist, loading, err, saving };
  }

  function WikiTab({ slug, title, accent }) {
    const { data, setData, loading, err, saving } = useWiki(slug);
    const [activeId, setActiveId] = useState(null);
    const [draft, setDraft] = useState(null);
    // Sidebar pagination — 20 pages per view. Operator request: long
    // wiki lists (especially versions) must paginate so the sidebar
    // doesn't run off the viewport. The active page is auto-located
    // when the wiki loads so pageIdx jumps to wherever activeId lives.
    const PAGES_PER_VIEW = 20;
    const [pageIdx, setPageIdx] = useState(0);
    const totalPages = Math.max(1, Math.ceil(data.pages.length / PAGES_PER_VIEW));

    useEffect(() => {
      if (!activeId && data.pages.length) setActiveId(data.pages[0].id);
    }, [data.pages, activeId]);

    // Keep pageIdx in range when pages get added / removed.
    useEffect(() => {
      if (pageIdx > totalPages - 1) setPageIdx(Math.max(0, totalPages - 1));
    }, [totalPages, pageIdx]);

    // When the active page is on a different "page" of the list, jump
    // there automatically so the sidebar always highlights the active.
    useEffect(() => {
      if (!activeId) return;
      const idx = data.pages.findIndex(p => p.id === activeId);
      if (idx < 0) return;
      const targetPage = Math.floor(idx / PAGES_PER_VIEW);
      if (targetPage !== pageIdx) setPageIdx(targetPage);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    const active = data.pages.find(p => p.id === activeId);
    const visiblePages = data.pages.slice(pageIdx * PAGES_PER_VIEW, (pageIdx + 1) * PAGES_PER_VIEW);

    function startEdit(p) { setDraft({ ...p }); }
    function cancelEdit() { setDraft(null); }
    async function saveEdit() {
      const next = { ...data, pages: data.pages.map(p => p.id === draft.id
        ? { ...draft, updated_at: new Date().toISOString() }
        : p) };
      await setData(next);
      setDraft(null);
    }
    async function addPage() {
      const id = 'p-' + Date.now().toString(36);
      const now = new Date().toISOString();
      const newPage = { id, title: 'New page', slug_path: '', body: '<p></p>', updated_at: now };
      const next = { ...data, pages: [newPage, ...data.pages] };
      await setData(next);
      setActiveId(id);
      setDraft(newPage);
    }
    async function deletePage(id) {
      if (!confirm('Delete this page? This cannot be undone.')) return;
      const next = { ...data, pages: data.pages.filter(p => p.id !== id) };
      await setData(next);
      if (activeId === id) setActiveId(next.pages[0]?.id || null);
      setDraft(null);
    }

    return (
      <div className="wiki" style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:20,minHeight:'70vh'}}>
        <aside className="wiki-side" style={{background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)',borderRadius:14,padding:14,height:'fit-content',position:'sticky',top:80}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 6px 12px',borderBottom:'1px solid var(--border-hair)',marginBottom:10}}>
            <strong style={{fontSize:13,color:'var(--fg-secondary)',letterSpacing:'0.06em',textTransform:'uppercase'}}>{data.pages.length} {data.pages.length === 1 ? 'page' : 'pages'}</strong>
            <button className="btn-add" style={{padding:'6px 12px',fontSize:12}} onClick={addPage} disabled={saving}>+ New</button>
          </div>
          {loading ? (
            <div style={{padding:14,fontSize:13,color:'var(--fg-muted)'}}>Loading…</div>
          ) : data.pages.length === 0 ? (
            <div style={{padding:14,fontSize:13,color:'var(--fg-muted)'}}>No pages yet.<br/>Click <em>+ New</em>.</div>
          ) : visiblePages.map(p => (
            <button key={p.id} type="button"
              onClick={() => { setActiveId(p.id); setDraft(null); }}
              style={{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',border:'none',borderRadius:8,
                      // Active state: tinted purple pill + brand-text color.
                      // --brand-text auto-flips to light lavender in dark mode
                      // (--brand-text dark = #DCC2FF) so the active label stays
                      // legible against --bg-elevated regardless of theme.
                      // Previously used --midnight-purple (fixed dark) which
                      // collapsed to ~1.5:1 contrast in dark mode — the same
                      // class of bug v01.026.04 fixed elsewhere.
                      background: activeId === p.id ? 'var(--scouting-purple-tint, rgba(98,37,153,0.10))' : 'transparent',
                      color: activeId === p.id ? 'var(--brand-text)' : 'var(--fg-primary)',
                      fontFamily:'inherit',fontSize:13,fontWeight: activeId === p.id ? 700 : 500,
                      cursor:'pointer',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {p.title || '(untitled)'}
            </button>
          ))}
        </aside>

        <main style={{minWidth:0}}>
          {err && <div role="alert" style={{padding:12,background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:10,marginBottom:14,fontSize:13}}>{err}</div>}
          {!active ? (
            <details className="card admin-fold" style={{textAlign:'center',padding:60,color:'var(--fg-muted)'}} open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:'0 0 8px'}}>{title}</h3></summary>
              <p style={{margin:0}}>Click <strong>+ New</strong> to create your first page.</p>
            </details>
          ) : draft ? (
            <div className="card">
              <div className="field">
                <label>Title</label>
                <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Slug (optional, lowercase-with-dashes)</label>
                <input value={draft.slug_path || ''} onChange={e => setDraft({ ...draft, slug_path: e.target.value })} placeholder="getting-started" />
              </div>
              <div className="field">
                <label>Body</label>
                <window.RichEditor
                  value={draft.body || ''}
                  onChange={(html) => setDraft({ ...draft, body: html })}
                  placeholder="Write your wiki page…"
                  minHeight={400}
                />
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={cancelEdit}>Cancel</button>
                <button className="btn btn-primary btn-sm" type="button" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,marginBottom:14}}>
                <div>
                  <div className="sec-kicker" style={{margin:0,color: accent || 'var(--scouting-purple)'}}>{title}</div>
                  <h2 style={{margin:'4px 0 6px',fontSize:24,fontFamily:'var(--font-en)'}}>{active.title}</h2>
                  <div style={{fontSize:12,color:'var(--fg-muted)'}}>
                    {active.slug_path && <span style={{fontFamily:'var(--font-mono)'}}>{active.slug_path}</span>}
                    {active.updated_at && <span style={{marginLeft: active.slug_path ? 12 : 0}}>updated {new Date(active.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button className="icon-btn" type="button" onClick={() => startEdit(active)}>Edit</button>
                  <button className="icon-btn danger" type="button" onClick={() => deletePage(active.id)}>Delete</button>
                </div>
              </div>
              <div className="rt-content" style={{padding:0,minHeight:0}}>
                <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: active.body || '<p style="color:#999;">(empty)</p>' }} />
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  function KmsTab() { return <WikiTab slug="kms" title="KMS · 코딩 위키" accent="#0094B4" />; }
  function ColorGuideTab() { return <WikiTab slug="color" title="컬러 가이드" accent="#F4B72E" />; }
  function LogoGuideTab()  { return <WikiTab slug="logo"  title="로고 가이드" accent="#6B2DBE" />; }
  function DesignGuideTab() { return <WikiTab slug="design" title="디자인 가이드" accent="#FF8DFF" />; }
  function VersionsTab() { return <WikiTab slug="versions" title="버전 기록 · Version history" accent="#34D399" />; }

  // GlobalSearch — sidebar search input + debounced /api/admin/search.
  // Renders results in a floating panel grouped by section. Sections
  // collapse when empty so the panel stays compact. Result rows are
  // read-only summaries — clicking does not navigate yet (most matched
  // entities don't have stable deep-link URLs in this single-page admin).
  // The operator can scan the previews to confirm what they found and
  // then click into the proper tab. ESC clears the query; clicking the
  // input refocuses.
  function GlobalSearch() {
    const [q, setQ] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
      const trimmed = q.trim();
      if (!trimmed) { setData(null); return; }
      let alive = true;
      const id = setTimeout(async () => {
        setLoading(true);
        try {
          const token = adminToken();
          const r = await fetch('/api/admin/search?q=' + encodeURIComponent(trimmed), {
            headers: authHeaders(),
          });
          const d = await r.json();
          if (alive) setData(r.ok ? d : { error: d.error || 'failed' });
        } catch (e) {
          if (alive) setData({ error: 'network' });
        } finally {
          if (alive) setLoading(false);
        }
      }, 300);
      return () => { alive = false; clearTimeout(id); };
    }, [q]);

    function onKey(e) {
      if (e.key === 'Escape') { setQ(''); inputRef.current && inputRef.current.blur(); }
    }

    const totalHits = data && !data.error
      ? (data.users?.length || 0) + (data.applications?.length || 0) + (data.inquiries?.length || 0)
        + (data.inbound_emails?.length || 0) + (data.outbound_emails?.length || 0)
        + (data.wiki?.length || 0) + (data.content?.length || 0)
      : 0;

    return (
      <div style={{margin:'0 12px 12px',position:'relative'}}>
        <div style={{position:'relative'}}>
          <i data-lucide="search" width="14" height="14" aria-hidden="true"
            style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.55)',pointerEvents:'none'}} />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="전체 검색 (회원·지원·문의·메일·위키…)"
            aria-label="Global admin search"
            style={{
              width:'100%',
              padding:'8px 10px 8px 30px',
              borderRadius:8,
              fontSize:13,
              background:'rgba(255,255,255,0.08)',
              border:'1px solid rgba(255,255,255,0.12)',
              color:'#fff',
              outline:'none',
            }} />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search"
              style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.55)',cursor:'pointer',padding:'4px 6px',fontSize:14,lineHeight:1}}>×</button>
          )}
        </div>
        {q.trim() && (
          <div role="region" aria-label="Search results"
            style={{
              position:'absolute', top:'calc(100% + 6px)', left:-4, right:-4,
              maxHeight:'calc(100vh - 200px)', overflowY:'auto', zIndex:50,
              background:'var(--bg-elevated, #1a1525)',
              border:'1px solid var(--border-default, rgba(255,255,255,0.14))',
              borderRadius:12,
              boxShadow:'0 16px 40px rgba(0,0,0,0.45)',
              padding:'10px 12px',
              color:'var(--fg-primary, #fff)',
              fontSize:13, lineHeight:1.45,
            }}>
            {loading && <div style={{padding:'8px 4px',color:'var(--fg-muted, rgba(255,255,255,0.6))'}}>검색 중…</div>}
            {!loading && data && data.error && (
              <div style={{padding:'8px 4px',color:'var(--state-danger, #f87171)'}}>오류: {data.error}</div>
            )}
            {!loading && data && !data.error && totalHits === 0 && (
              <div style={{padding:'8px 4px',color:'var(--fg-muted, rgba(255,255,255,0.6))'}}>일치하는 결과가 없습니다.</div>
            )}
            {!loading && data && !data.error && totalHits > 0 && (
              <>
                <SearchSection label="회원" items={data.users || []} renderItem={u => (
                  <div>
                    <strong>{u.name || '—'}</strong>
                    <span style={{color:'var(--fg-muted)',marginLeft:8}}>{u.email}</span>
                    <span style={{marginLeft:8,fontSize:11,padding:'1px 6px',borderRadius:99,background:'rgba(255,255,255,0.08)'}}>{u.role}</span>
                  </div>
                )} />
                <SearchSection label="지원서" items={data.applications || []} renderItem={a => (
                  <div>
                    <strong style={{fontFamily:'var(--font-mono, monospace)',fontSize:11}}>{a.id}</strong>
                    <span style={{marginLeft:8}}>{a.name || '—'}</span>
                    <span style={{color:'var(--fg-muted)',marginLeft:8}}>{a.email}</span>
                    {a.status && <span style={{marginLeft:8,fontSize:11,padding:'1px 6px',borderRadius:99,background:'rgba(255,255,255,0.08)'}}>{a.status}</span>}
                  </div>
                )} />
                <SearchSection label="문의" items={data.inquiries || []} renderItem={iq => (
                  <div>
                    <strong>{iq.subject || '—'}</strong>
                    <div style={{color:'var(--fg-muted)',fontSize:12}}>{iq.email} · {(iq.preview || '').slice(0, 100)}</div>
                  </div>
                )} />
                <SearchSection label="받은 메일" items={data.inbound_emails || []} renderItem={m => (
                  <div>
                    <strong>{m.subject || '(제목 없음)'}</strong>
                    <div style={{color:'var(--fg-muted)',fontSize:12}}>from {m.from_addr} · {(m.preview || '').slice(0, 100)}</div>
                  </div>
                )} />
                <SearchSection label="보낸 메일" items={data.outbound_emails || []} renderItem={m => (
                  <div>
                    <strong>{m.subject || '(제목 없음)'}</strong>
                    <div style={{color:'var(--fg-muted)',fontSize:12}}>to {m.to_addr} · {(m.preview || '').slice(0, 100)}</div>
                  </div>
                )} />
                <SearchSection label="위키" items={data.wiki || []} renderItem={w => (
                  <div>
                    <strong>{w.title}</strong>
                    <span style={{marginLeft:8,fontSize:11,padding:'1px 6px',borderRadius:99,background:'rgba(255,255,255,0.08)'}}>{w.slug}</span>
                    <div style={{color:'var(--fg-muted)',fontSize:12}}>{w.excerpt}</div>
                  </div>
                )} />
                <SearchSection label="콘텐츠" items={data.content || []} renderItem={c => (
                  <div>
                    <strong style={{fontFamily:'var(--font-mono, monospace)',fontSize:11}}>{c.path}</strong>
                    <div style={{color:'var(--fg-muted)',fontSize:12}}>{c.value}</div>
                  </div>
                )} />
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function SearchSection({ label, items, renderItem }) {
    if (!items || !items.length) return null;
    return (
      <div style={{marginBottom:8}}>
        <div style={{
          fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
          color:'var(--fg-muted, rgba(255,255,255,0.55))', margin:'6px 4px 4px',
        }}>{label} <span style={{opacity:0.7}}>({items.length})</span></div>
        {items.map((it, i) => (
          <div key={i} style={{
            padding:'8px 8px',
            borderRadius:6,
            marginBottom:2,
            background:'rgba(255,255,255,0.03)',
          }}>{renderItem(it)}</div>
        ))}
      </div>
    );
  }

  // ---- Design System (live previews) -------------------------------------
  // Reads CSS variables from the document root so previews always reflect
  // the *deployed* colors_and_type.css — not a hand-maintained copy.
  function useCssVar(name) {
    const [v, setV] = useState('');
    useEffect(() => {
      const cs = getComputedStyle(document.documentElement);
      setV((cs.getPropertyValue(name) || '').trim());
    }, [name]);
    return v;
  }

  function Swatch({ varName, label, note, big }) {
    const val = useCssVar(varName);
    const [copied, setCopied] = useState(false);
    function copy() {
      navigator.clipboard.writeText(varName).then(() => {
        setCopied(true); setTimeout(() => setCopied(false), 1200);
      });
    }
    const w = big ? 88 : 56;
    return (
      <div onClick={copy} title="Click to copy var()" style={{
        cursor:'pointer', display:'flex', alignItems:'center', gap:14,
        padding:'10px 12px', borderRadius:10, transition:'background 120ms',
        background: copied ? 'rgba(36,135,55,0.06)' : 'transparent'
      }}
        onMouseOver={e => e.currentTarget.style.background = copied ? 'rgba(36,135,55,0.06)' : 'var(--bg-muted)'}
        onMouseOut={e => e.currentTarget.style.background = copied ? 'rgba(36,135,55,0.06)' : 'transparent'}>
        <div style={{
          width:w, height:w, flexShrink:0,
          borderRadius:12, background: val || '#eee',
          border:'1px solid rgba(0,0,0,0.08)'
        }} />
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:700, fontSize:13}}>{label}</div>
          <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-muted)'}}>
            {varName} · <span style={{textTransform:'uppercase'}}>{val}</span>
          </div>
          {note && <div style={{fontSize:12, color:'var(--fg-secondary)', marginTop:2}}>{note}</div>}
        </div>
        {copied && <span style={{fontSize:11, color:'var(--state-success)', fontWeight:600}}>✓ copied</span>}
      </div>
    );
  }

  function Swatches({ items, big, cols = 2 }) {
    return (
      <div style={{display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:6}}>
        {items.map(s => <Swatch key={s.var} varName={s.var} label={s.label} note={s.note} big={big} />)}
      </div>
    );
  }

  function Section({ title, kicker, children }) {
    return (
      <div className="card" style={{marginBottom:24}}>
        {kicker && <div className="sec-kicker" style={{margin:'0 0 4px'}}>{kicker}</div>}
        <h3 style={{margin:'0 0 18px', fontSize:20}}>{title}</h3>
        {children}
      </div>
    );
  }

  function DesignSystemTab() {
    return (
      <>
        <div className="card" style={{background:'linear-gradient(135deg, #0F0A30 0%, #1E1654 100%)', color:'#fff', marginBottom:24}}>
          <div className="sec-kicker" style={{color:'rgba(255,228,0,0.9)', margin:0}}>DESIGN SYSTEM</div>
          <h2 style={{margin:'4px 0 6px', fontSize:28, fontFamily:'var(--font-en)'}}>KoreaDreamPath Design System</h2>
          <p style={{margin:0, color:'rgba(255,255,255,0.85)', fontSize:14}}>
            Live preview — every value below is read from <code style={{background:'rgba(0,0,0,0.25)', padding:'2px 6px', borderRadius:4}}>colors_and_type.css</code>. Click any swatch to copy its <code style={{background:'rgba(0,0,0,0.25)', padding:'2px 6px', borderRadius:4}}>var(--name)</code>.
          </p>
        </div>

        <Section kicker="01 · Brand" title="Primary brand colors">
          <Swatches big cols={2} items={[
            { var:'--midnight-purple', label:'Deep Indigo',    note:'Foundation 60% · buttons / hero / dark surfaces' },
            { var:'--scouting-purple', label:'Vivid Purple',   note:'Activation 25% · links, focus, secondary brand' },
            { var:'--sunshine-yellow', label:'Star Gold',      note:'Accent 8% (one-only) · wordmark, highlight' },
            { var:'--royal-purple',    label:'Royal Purple',   note:'Outline 5% · outlined buttons, dividers' },
            { var:'--soft-lavender',   label:'Soft Lavender',  note:'Surface tint 2% · brand-tinted panels' },
          ]} />
        </Section>

        <Section kicker="02 · Brand" title="Secondary palette — 4 base+tint pairs">
          <p className="desc" style={{margin:'-4px 0 12px',fontSize:13,color:'var(--fg-muted)'}}>
            Each row is a pair: <strong>base (left, dominant)</strong> + <strong>tint (right, soft companion)</strong>.
            Use a pair together; do not mix bases from different pairs in the same composition.
          </p>
          <Swatches cols={2} items={[
            { var:'--fire-red',         label:'Fire Red',         note:'base · alerts, intense state' },
            { var:'--ember-orange',     label:'Ember Orange',     note:'tint · warm highlight' },
            { var:'--ocean-blue',       label:'Ocean Blue',       note:'base · info, focus accent' },
            { var:'--river-blue',       label:'River Blue',       note:'tint · info background' },
            { var:'--forest-green',     label:'Forest Green',     note:'base · success, confirmation' },
            { var:'--leaf-green',       label:'Leaf Green',       note:'tint · success background' },
            { var:'--midnight-violet',  label:'Midnight Violet',  note:'base · deep brand-adjacent' },
            { var:'--blossom-pink',     label:'Blossom Pink',     note:'tint · playful highlight' },
          ]} />
        </Section>

        <Section kicker="03 · Neutrals" title="Gray scale (9-stop)">
          <Swatches cols={3} items={[
            { var:'--gray-50',  label:'50' },
            { var:'--gray-100', label:'100' },
            { var:'--gray-200', label:'200' },
            { var:'--gray-300', label:'300' },
            { var:'--gray-400', label:'400' },
            { var:'--gray-500', label:'500' },
            { var:'--gray-600', label:'600' },
            { var:'--gray-700', label:'700' },
            { var:'--gray-800', label:'800' },
            { var:'--gray-900', label:'900' },
          ]} />
        </Section>

        <Section kicker="04 · Semantic" title="Foreground / Background / Border">
          <Swatches cols={2} items={[
            { var:'--fg-primary',     label:'fg-primary',     note:'Body text, headings' },
            { var:'--fg-secondary',   label:'fg-secondary',   note:'Sub-headings, descriptions' },
            { var:'--fg-muted',       label:'fg-muted',       note:'Captions, placeholders' },
            { var:'--fg-link',        label:'fg-link',        note:'Hyperlinks' },
            { var:'--canvas-white',   label:'canvas-white',   note:'Page background' },
            { var:'--bg-muted',       label:'bg-muted',       note:'Section dividers' },
            { var:'--border-subtle',  label:'border-subtle',  note:'Card borders' },
            { var:'--border-default', label:'border-default', note:'Form fields' },
          ]} />
        </Section>

        <Section kicker="05 · State" title="Status colors">
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12}}>
            {[
              { fg:'--state-success', bg:'--state-success-bg', label:'Success' },
              { fg:'--state-warning', bg:'--state-warning-bg', label:'Warning' },
              { fg:'--state-danger',  bg:'--state-danger-bg',  label:'Danger' },
              { fg:'--state-info',    bg:'--state-info-bg',    label:'Info' },
            ].map(s => (
              <div key={s.label} style={{
                padding:'14px 16px', borderRadius:12,
                background:`var(${s.bg})`, color:`var(${s.fg})`,
                fontWeight:700, display:'flex', justifyContent:'space-between',
                alignItems:'center'
              }}>
                <span>{s.label}</span>
                <span style={{fontFamily:'var(--font-mono)', fontSize:11, opacity:0.8}}>{s.fg} / {s.bg}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="06 · Typography" title="Type scale">
          <div style={{display:'flex', flexDirection:'column', gap:16, alignItems:'flex-start'}}>
            {[
              ['--text-5xl', 'Hero — 한 학습 경로', 'Hero — One learning path', 'tight'],
              ['--text-4xl', '4xl — 페이지 제목',    '4xl — Page title',         'tight'],
              ['--text-3xl', '3xl — 섹션 제목',      '3xl — Section title',      'snug'],
              ['--text-2xl', '2xl — 카드 헤딩',      '2xl — Card heading',       'snug'],
              ['--text-xl',  'xl — 강조 본문',       'xl — Emphasized body',     'normal'],
              ['--text-lg',  'lg — 인트로 문단',     'lg — Intro paragraph',     'normal'],
              ['--text-md',  'md — 본문 강조',       'md — Body emphasized',     'normal'],
              ['--text-base','base — 본문 기본',     'base — Body default',      'normal'],
              ['--text-sm',  'sm — 부가 정보',       'sm — Meta info',           'normal'],
              ['--text-xs',  'xs — 캡션',            'xs — Caption',             'normal'],
            ].map(([v, ko, en, leading]) => (
              <div key={v} style={{display:'flex', alignItems:'baseline', gap:24, flexWrap:'wrap'}}>
                <span style={{
                  fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-muted)',
                  width:80, flexShrink:0, paddingTop:6
                }}>{v.replace('--text-', '')}</span>
                <span style={{
                  fontSize:`var(${v})`, fontFamily:'var(--font-kr)',
                  lineHeight:`var(--leading-${leading})`, fontWeight:600,
                  letterSpacing: v === '--text-5xl' ? '-0.03em' : '-0.01em'
                }}>{ko}</span>
                <span style={{
                  fontSize:`var(${v})`, fontFamily:'var(--font-en)',
                  lineHeight:`var(--leading-${leading})`, fontWeight:600,
                  letterSpacing:'-0.02em', color:'var(--fg-secondary)'
                }}>{en}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="07 · Typography" title="Font families">
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16}}>
            {[
              { v:'--font-kr',   label:'KR (Pretendard)', sample:'다국어 청년을 한국 고등교육으로 연결합니다. 0123456789' },
              { v:'--font-en',   label:'EN (Inter)',      sample:'KoreaDreamPath connects youth across 170 countries. 0123456789' },
              { v:'--font-sans', label:'sans (mixed)',    sample:'Pretendard 우선 → Inter 보조. Mixed safe default.' },
              { v:'--font-mono', label:'mono (JetBrains)', sample:'const wow = "monospace"; // dp_view = home;' },
            ].map(f => (
              <div key={f.v} style={{padding:'14px 16px', background:'var(--bg-muted)', borderRadius:12}}>
                <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-muted)', marginBottom:6}}>{f.v}</div>
                <div style={{fontWeight:700, fontSize:13, marginBottom:8}}>{f.label}</div>
                <div style={{fontFamily:`var(${f.v})`, fontSize:15, lineHeight:1.5}}>{f.sample}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="08 · Spacing" title="Spacing scale (4px base)">
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {['1','2','3','4','5','6','8','10','12','16','20'].map(n => {
              const v = `--space-${n}`;
              return (
                <div key={n} style={{display:'flex', alignItems:'center', gap:14}}>
                  <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-muted)', width:80, flexShrink:0}}>{v}</span>
                  <div style={{height:14, background:'var(--scouting-purple)', borderRadius:3, width:`var(${v})`, flexShrink:0}} />
                  <span style={{fontSize:12, color:'var(--fg-secondary)'}}>{useCssVar(v)}</span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section kicker="09 · Radii" title="Border radius">
          <div style={{display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-end'}}>
            {[
              ['--radius-sm', 'sm'], ['--radius-md', 'md'], ['--radius-lg', 'lg'],
              ['--radius-xl', 'xl'], ['--radius-2xl', '2xl'], ['--radius-pill', 'pill'],
            ].map(([v, label]) => (
              <div key={v} style={{textAlign:'center'}}>
                <div style={{
                  width:80, height:80, background:'var(--scouting-purple)',
                  borderRadius:`var(${v})`, marginBottom:6
                }} />
                <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)'}}>{v}</div>
                <div style={{fontSize:12, fontWeight:600}}>{label}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="10 · Shadows" title="Shadow levels">
          <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:18}}>
            {[
              ['--shadow-xs', 'xs'], ['--shadow-sm', 'sm'], ['--shadow-md', 'md'],
              ['--shadow-lg', 'lg'], ['--shadow-brand', 'brand'],
            ].map(([v, label]) => (
              <div key={v} style={{textAlign:'center'}}>
                <div style={{
                  width:'100%', height:80, background:'var(--bg-elevated)',
                  borderRadius:14, boxShadow:`var(${v})`, marginBottom:8
                }} />
                <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)'}}>{v}</div>
                <div style={{fontSize:12, fontWeight:600}}>{label}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="11 · Buttons" title="All button variants × sizes">
          <div style={{display:'grid', gridTemplateColumns:'80px repeat(5, 1fr)', gap:12, alignItems:'center'}}>
            <div></div>
            {['primary','secondary','ghost','white','outline'].map(v => (
              <div key={v} style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)', textAlign:'center'}}>btn-{v}</div>
            ))}
            {['sm','','lg'].map(size => {
              const sizeClass = size ? ` btn-${size}` : '';
              const sizeLabel = size || 'md';
              const dark = ['white','outline'];
              return (
                <React.Fragment key={size}>
                  <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)'}}>btn-{sizeLabel}</div>
                  {['primary','secondary','ghost','white','outline'].map(v => (
                    <div key={v} style={{
                      padding:14, borderRadius:10,
                      background: dark.includes(v) ? 'var(--midnight-purple)' : 'var(--bg-muted)',
                      display:'flex', justifyContent:'center'
                    }}>
                      <button type="button" className={`btn btn-${v}${sizeClass}`}>Button</button>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
          <div style={{marginTop:18, padding:14, background:'var(--bg-muted)', borderRadius:10, display:'flex', gap:10, alignItems:'center'}}>
            <span style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)', width:90}}>states</span>
            <button type="button" className="btn btn-primary">default</button>
            <button type="button" className="btn btn-primary" disabled>disabled</button>
            <button type="button" className="btn btn-primary btn-block" style={{maxWidth:200}}>btn-block</button>
            <button type="button" className="btn btn-secondary">+ icon</button>
          </div>
        </Section>

        <Section kicker="12 · Forms" title="Form fields">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:600}}>
            <div className="field"><label>Text input</label><input type="text" placeholder="Placeholder…" /></div>
            <div className="field"><label>Email</label><input type="email" placeholder="you@example.com" /></div>
            <div className="field"><label>Select</label><select><option>One</option><option>Two</option></select></div>
            <div className="field"><label>Date</label><input type="date" /></div>
            <div className="field" style={{gridColumn:'span 2'}}><label>Textarea</label><textarea rows="3" placeholder="Multi-line text…" /></div>
          </div>
        </Section>

        <Section kicker="13 · Badges" title="Pills & status badges">
          <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
            <span style={{padding:'4px 12px', borderRadius:999, background:'var(--state-success-bg)', color:'var(--state-success)', fontSize:12, fontWeight:700}}>✓ PAID</span>
            <span style={{padding:'4px 12px', borderRadius:999, background:'var(--state-warning-bg)', color:'var(--state-warning)', fontSize:12, fontWeight:700}}>PENDING</span>
            <span style={{padding:'4px 12px', borderRadius:999, background:'var(--state-danger-bg)', color:'var(--state-danger)', fontSize:12, fontWeight:700}}>FAILED</span>
            <span style={{padding:'4px 12px', borderRadius:999, background:'var(--state-info-bg)', color:'var(--state-info)', fontSize:12, fontWeight:700}}>NEW</span>
            <span style={{padding:'4px 12px', borderRadius:999, background:'rgba(98,37,153,0.10)', color:'var(--scouting-purple)', fontSize:12, fontWeight:700}}>BRAND</span>
            <span style={{padding:'4px 12px', borderRadius:999, background:'var(--bg-muted)', color:'var(--fg-secondary)', fontSize:12, fontWeight:700}}>NEUTRAL</span>
          </div>
        </Section>

        <Section kicker="14 · Icons" title="Icon sizes (Lucide)">
          <div style={{display:'flex', gap:24, alignItems:'flex-end', flexWrap:'wrap'}}>
            {[['--icon-xs','xs',2],['--icon-sm','sm',2],['--icon-md','md',1.75],['--icon-lg','lg',1.75],['--icon-xl','xl',1.5],['--icon-2xl','2xl',1.5]].map(([v, label, sw]) => {
              const px = useCssVar(v);
              return (
                <div key={v} style={{textAlign:'center', minWidth:60}}>
                  <div style={{height:50, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--brand-text)'}}>
                    <i data-lucide="circle-check-big" width={px} height={px} strokeWidth={sw}></i>
                  </div>
                  <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)', marginTop:6}}>{v}</div>
                  <div style={{fontSize:12, fontWeight:600}}>{label} · {px}</div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section kicker="15 · Motion" title="Duration & easing">
          <MotionPreview />
        </Section>

        <Section kicker="16 · Focus" title="Focus ring">
          <div style={{padding:24, background:'var(--bg-muted)', borderRadius:14}}>
            <p style={{margin:'0 0 14px', fontSize:13, color:'var(--fg-secondary)'}}>Tab to any of these to see the focus ring (uses <code>--focus-color</code> + <code>--focus-width</code>):</p>
            <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
              <button type="button" className="btn btn-primary">Button</button>
              <button type="button" className="btn btn-secondary">Button</button>
              <a href="#" style={{color:'var(--scouting-purple)', padding:'8px 12px'}}>Link</a>
              <input type="text" placeholder="Input" style={{padding:'10px 12px', borderRadius:8, border:'1px solid var(--border-default)'}} />
            </div>
          </div>
        </Section>
      </>
    );
  }
