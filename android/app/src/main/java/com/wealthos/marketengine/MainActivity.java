package com.wealthos.marketengine;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public class MainActivity extends AppCompatActivity {

    private static final String SERVER_URL = "https://config.39.106.118.186.nip.io/";
    private static final String HEALTH_URL = "https://config.39.106.118.186.nip.io/api/health";
    private static final int FILE_CHOOSER_REQUEST = 1;

    private String executionRoute = "";
    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout loadingView;
    private LinearLayout errorView;
    private TextView errorDetail;
    private TextView loadingText;
    private com.google.android.material.button.MaterialButton retryBtn;
    private ImageButton navBack;
    private ImageButton navRefresh;

    private ValueCallback<Uri[]> filePathCallback;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        executionRoute=getIntent().getStringExtra("executionRoute");
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        loadingView = findViewById(R.id.loadingView);
        errorView = findViewById(R.id.errorView);
        errorDetail = findViewById(R.id.errorDetail);
        loadingText = findViewById(R.id.loadingText);
        retryBtn = findViewById(R.id.retryBtn);
        navBack = findViewById(R.id.navBack);
        navRefresh = findViewById(R.id.navRefresh);
        navBack.setVisibility(View.GONE);
        navRefresh.setVisibility(View.GONE);
        retryBtn.setOnClickListener(v -> checkServerAndLoad());
        navBack.setOnClickListener(v -> handleBack());
        navRefresh.setOnClickListener(v -> {
            CookieManager.getInstance().flush();
            if (isNetworkAvailable()) webView.reload();
            else Toast.makeText(this, R.string.offline_subtitle, Toast.LENGTH_SHORT).show();
        });

        setupBackHandling();
        setupStatusBar();
        setupWebView();
        setupSwipeRefresh();
        setupCookies();

        // Check network + health before loading
        checkServerAndLoad();
    }

    private void setupBackHandling() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBack();
            }
        });
    }

    private void handleBack() {
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return window.dshAndroidBack?window.dshAndroidBack():false}catch(e){return false}})()",
                value -> {
                    if ("true".equals(value)) return;
                    // SPA 的页面切换不依赖 WebView 历史；不要 goBack 到登录页。
                    moveTaskToBack(true);
                });
    }

    private void setupStatusBar() {
        Window window = getWindow();
        window.setStatusBarColor(ContextCompat.getColor(this, R.color.status_bar));
        window.setNavigationBarColor(ContextCompat.getColor(this, R.color.nav_bar));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.getDecorView().getWindowInsetsController().setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
        } else {
            View decor = window.getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setTextZoom(100);

        // Mobile user agent so the web app applies its responsive layout
        String ua = s.getUserAgentString();
        if (ua != null) {
            s.setUserAgentString(ua.replace("; wv", "") + " Mobile");
        }

        // Enable safe browsing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
        }

        webView.setWebViewClient(new AppWebViewClient());
        webView.setWebChromeClient(new AppWebChromeClient());
        webView.setDownloadListener(new AppDownloadListener());
        webView.setInitialScale(100);
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    private class AppDownloadListener implements DownloadListener {
        @Override
        public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                String cookie = CookieManager.getInstance().getCookie(url);
                req.addRequestHeader("Cookie", cookie);
                req.addRequestHeader("User-Agent", userAgent);
                req.setMimeType(mimetype);
                String filename = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimetype);
                req.setTitle(filename);
                req.setDescription("正在下载: " + filename);
                req.allowScanningByMediaScanner();
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.enqueue(req);
                    Toast.makeText(MainActivity.this, "开始下载: " + filename, Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, "下载失败，请在浏览器中打开", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void setupCookies() {
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);
        // Don't flush immediately; let WebView handle session cookies
    }

    private void setupSwipeRefresh() {
        // Android 上禁用下拉刷新，避免误触导致页面重载或回到登录页。
        swipeRefresh.setEnabled(false);
        swipeRefresh.setColorSchemeResources(R.color.brand_accent, R.color.brand_good);
        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.brand_card);
    }

    private void checkServerAndLoad() {
        if (!isNetworkAvailable()) {
            showError("设备未连接到互联网，请检查网络设置");
            return;
        }
        // 不阻塞在原生健康检查上：直接交给 WebView 加载，
        // 证书与网络错误由 WebViewClient 统一处理。
        showLoading("正在加载工作台…");
        webView.loadUrl(SERVER_URL);
    }

    private boolean pingServerHealth() {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(HEALTH_URL);
            conn = (HttpURLConnection) url.openConnection();
            // Handle self-signed certificate
            if (conn instanceof HttpsURLConnection) {
                HttpsURLConnection https = (HttpsURLConnection) conn;
                SSLContext sc = SSLContext.getInstance("TLS");
                sc.init(null, new TrustManager[]{new X509TrustManager() {
                    @Override public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {}
                    @Override public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {}
                    @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                }}, new java.security.SecureRandom());
                https.setSSLSocketFactory(sc.getSocketFactory());
                https.setHostnameVerifier((hostname, session) -> true);
            }
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setInstanceFollowRedirects(true);
            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                br.close();
                try {
                    JSONObject obj = new JSONObject(sb.toString());
                    return obj.optBoolean("ok", false) || code == 200;
                } catch (Exception ignored) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network net = cm.getActiveNetwork();
            if (net == null) return false;
            NetworkCapabilities caps = cm.getNetworkCapabilities(net);
            return caps != null && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
        } else {
            android.net.NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        }
    }

    private void showLoading(String msg) {
        runOnUiThread(() -> {
            loadingText.setText(msg);
            loadingView.setVisibility(View.VISIBLE);
            errorView.setVisibility(View.GONE);
            webView.setVisibility(View.INVISIBLE);
        });
    }

    private void showError(String msg) {
        runOnUiThread(() -> {
            errorDetail.setText(msg);
            errorView.setVisibility(View.VISIBLE);
            loadingView.setVisibility(View.GONE);
            webView.setVisibility(View.INVISIBLE);
        });
    }

    private void showContent() {
        runOnUiThread(() -> {
            loadingView.setVisibility(View.GONE);
            errorView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        menu.add(0, 1, 0, R.string.menu_refresh).setIcon(android.R.drawable.ic_menu_rotate).setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
        menu.add(0, 2, 1, R.string.menu_copy_url);
        menu.add(0, 3, 2, R.string.menu_open_browser);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case 1:
                if (isNetworkAvailable()) webView.reload();
                else Toast.makeText(this, R.string.offline_subtitle, Toast.LENGTH_SHORT).show();
                return true;
            case 2:
                ClipboardManager cb = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                cb.setPrimaryClip(ClipData.newPlainText("url", webView.getUrl()));
                Toast.makeText(this, R.string.url_copied, Toast.LENGTH_SHORT).show();
                return true;
            case 3:
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(webView.getUrl())));
                } catch (Exception e) {
                    Toast.makeText(this, "无法打开浏览器", Toast.LENGTH_SHORT).show();
                }
                return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if(requestCode==72&&resultCode==Activity.RESULT_OK&&data!=null){java.util.ArrayList<String> words=data.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);if(words!=null&&!words.isEmpty()&&trustedPage())webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-voice',{detail:"+JSONObject.quote(words.get(0))+"}))",null);}
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                    ClipData clip = data.getClipData();
                    if (clip != null) {
                        results = new Uri[clip.getItemCount()];
                        for (int i = 0; i < clip.getItemCount(); i++) {
                            results[i] = clip.getItemAt(i).getUri();
                        }
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.evaluateJavascript("window.dispatchEvent(new Event('xindeng-resume'))", null);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        executor.shutdown();
        super.onDestroy();
    }

    // ---------- WebViewClient ----------
    private boolean trustedPage() {return webView!=null && webView.getUrl()!=null && webView.getUrl().startsWith(SERVER_URL);}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);executionRoute=intent.getStringExtra("executionRoute");}
    private class AndroidBridge {
        @JavascriptInterface public String consumeExecutionRoute(){String route=executionRoute;executionRoute="";return route==null?"":route;}
        @JavascriptInterface public void configureShortcuts(String json){runOnUiThread(()->{if(!trustedPage()||Build.VERSION.SDK_INT<25)return;try{org.json.JSONArray rows=new org.json.JSONArray(json);java.util.List<android.content.pm.ShortcutInfo> shortcuts=new java.util.ArrayList<>();android.content.pm.ShortcutManager manager=getSystemService(android.content.pm.ShortcutManager.class);for(int n=0;n<Math.min(rows.length(),manager.getMaxShortcutCountPerActivity());n++){org.json.JSONObject row=rows.getJSONObject(n);String page=row.getString("page");Intent i=new Intent(MainActivity.this,MainActivity.class).setAction(Intent.ACTION_VIEW).putExtra("executionRoute",page);shortcuts.add(new android.content.pm.ShortcutInfo.Builder(MainActivity.this,page).setShortLabel(row.getString("label")).setIcon(android.graphics.drawable.Icon.createWithResource(MainActivity.this,R.mipmap.ic_launcher)).setIntent(i).build());}manager.setDynamicShortcuts(shortcuts);}catch(Exception ignored){}});}
        @JavascriptInterface public void syncReminders(String json){runOnUiThread(()->{if(trustedPage())ReminderReceiver.sync(MainActivity.this,json);});}
        @JavascriptInterface public void requestReminderPermission(){runOnUiThread(()->{if(!trustedPage())return;if(Build.VERSION.SDK_INT>=33)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},71);else startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName()));});}
        @JavascriptInterface public void requestAlarmPermission(){runOnUiThread(()->{if(trustedPage()&&Build.VERSION.SDK_INT>=31)startActivity(new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));});}
        @JavascriptInterface public void startVoiceInput(){runOnUiThread(()->{if(!trustedPage())return;try{Intent i=new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE,"zh-CN");startActivityForResult(i,72);}catch(Exception e){Toast.makeText(MainActivity.this,"系统未提供语音识别，请使用键盘麦克风",Toast.LENGTH_LONG).show();}});}

        @JavascriptInterface
        public void setBackVisible(final boolean visible) {
            runOnUiThread(() -> navBack.setVisibility(View.GONE));
        }
    }

    private class AppWebViewClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            if (loadingView.getVisibility() != View.VISIBLE) {
                swipeRefresh.setRefreshing(true);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            swipeRefresh.setRefreshing(false);
            CookieManager.getInstance().flush();
            showContent();
            injectMobileAdaptations(view);
        }

        private void injectMobileAdaptations(WebView view) {
            // Responsive styling belongs to the shared website, so web updates apply consistently.
            view.evaluateJavascript("window.dshAndroidBack=function(){try{"
                + "var dialog=document.querySelector('dialog[open]');if(dialog){dialog.dispatchEvent(new Event('cancel'));dialog.remove();return true;}"
                + "var sh=document.querySelector('#uiSheet.is-open');if(sh&&window.UISheet){UISheet.close();return true;}"
                + "var modal=document.querySelector('.flow-modal');if(modal){document.querySelector('[data-action=flow-modal-close]')?.click();return true;}"
                + "if(typeof currentPage!=='undefined'&&currentPage!=='dailyflow'){renderPage('dailyflow');return true;}"
                + "if(window.scrollY>120){window.scrollTo({top:0,behavior:'smooth'});return true;}"
                + "}catch(e){}return false;};", null);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                mainHandler.post(() -> {
                    swipeRefresh.setRefreshing(false);
                    String desc = error.getDescription() != null ? error.getDescription().toString() : "未知错误";
                    showError("页面加载失败：" + desc + "\n\n点击下方按钮重试");
                });
            }
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            // Server uses a self-signed certificate; proceed for our known domain.
            handler.proceed();
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse errorResponse) {
            super.onReceivedHttpError(view, request, errorResponse);
            if (request.isForMainFrame()) {
                int code = errorResponse.getStatusCode();
                if (code >= 400) {
                    mainHandler.post(() -> {
                        swipeRefresh.setRefreshing(false);
                        showError("服务器返回错误 " + code + "\n\n点击下方按钮重试");
                    });
                }
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String host = uri.getHost();
            // Stay in app for the target server; open external links in browser
            if (host != null && (host.contains("39.106.118.186") || host.endsWith("nip.io"))) {
                return false;
            }
            if ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme())) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }
            return false;
        }
    }

    // ---------- WebChromeClient ----------
    private class AppWebChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (MainActivity.this.filePathCallback != null) {
                MainActivity.this.filePathCallback.onReceiveValue(null);
            }
            MainActivity.this.filePathCallback = filePathCallback;
            Intent intent = fileChooserParams.createIntent();
            try {
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
            } catch (Exception e) {
                MainActivity.this.filePathCallback = null;
                return false;
            }
            return true;
        }

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            super.onProgressChanged(view, newProgress);
            if (newProgress >= 100) {
                swipeRefresh.setRefreshing(false);
            }
        }
    }
}
