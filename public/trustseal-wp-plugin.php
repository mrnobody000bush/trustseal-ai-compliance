<?php
/**
 * Plugin Name: TrustSeal AI — Domain Verification & Widget
 * Description: Verifies domain ownership with TrustSeal AI and injects the compliance widget.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) { exit; }

define('TRUSTSEAL_API', 'https://project--0ffdbdd8-3f9d-466a-893c-6705cb54b589.lovable.app');

add_action('admin_menu', function () {
    add_options_page('TrustSeal', 'TrustSeal', 'manage_options', 'trustseal', 'trustseal_settings_page');
});

add_action('admin_init', function () {
    register_setting('trustseal', 'trustseal_token');
    register_setting('trustseal', 'trustseal_site_id');
});

function trustseal_settings_page() {
    ?>
    <div class="wrap">
        <h1>TrustSeal AI</h1>
        <form method="post" action="options.php">
            <?php settings_fields('trustseal'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="trustseal_token">Verification key</label></th>
                    <td><input name="trustseal_token" id="trustseal_token" type="text" class="regular-text"
                               value="<?php echo esc_attr(get_option('trustseal_token', '')); ?>"></td>
                </tr>
            </table>
            <?php submit_button('Save & verify'); ?>
        </form>
        <p><strong>Status:</strong> <?php echo esc_html(get_option('trustseal_status', 'not verified')); ?></p>
    </div>
    <?php
}

function trustseal_verify() {
    $token = trim(get_option('trustseal_token', ''));
    if (!$token) { return; }

    $response = wp_remote_post(TRUSTSEAL_API . '/api/public/plugin-verify', array(
        'headers' => array('Content-Type' => 'application/json'),
        'timeout' => 15,
        'body'    => wp_json_encode(array(
            'token'          => $token,
            'domain'         => wp_parse_url(home_url(), PHP_URL_HOST),
            'plugin_version' => '1.0.0',
        )),
    ));

    if (is_wp_error($response)) {
        update_option('trustseal_status', 'connection error');
        return;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!empty($body['ok'])) {
        update_option('trustseal_status', 'verified');
        update_option('trustseal_site_id', $body['site_id']);
    } else {
        update_option('trustseal_status', 'failed: ' . (isset($body['error']) ? $body['error'] : 'unknown'));
    }
}

// Verify on activation, whenever the key is saved, and daily as a heartbeat.
register_activation_hook(__FILE__, 'trustseal_verify');
add_action('update_option_trustseal_token', 'trustseal_verify');
add_action('trustseal_daily_ping', 'trustseal_verify');
add_action('init', function () {
    if (!wp_next_scheduled('trustseal_daily_ping')) {
        wp_schedule_event(time(), 'daily', 'trustseal_daily_ping');
    }
});

// Inject the widget once verified.
add_action('wp_footer', function () {
    $site_id = get_option('trustseal_site_id', '');
    if (get_option('trustseal_status') !== 'verified' || !$site_id) { return; }
    printf(
        '<script async src="%s/embed.js" data-trustseal="%s"></script>',
        esc_url(TRUSTSEAL_API),
        esc_attr($site_id)
    );
});
