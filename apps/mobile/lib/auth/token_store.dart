import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where the refresh token lives between app starts: the Android Keystore or the
/// iOS Keychain, never plain files. The access token stays in memory only.
abstract class TokenStore {
  Future<String?> readRefreshToken();
  Future<void> saveRefreshToken(String token);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            // Only this device, and only while it is unlocked (not in backups).
            iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
          );

  final FlutterSecureStorage _storage;
  static const _refreshKey = 'kcp.refreshToken';

  @override
  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  @override
  Future<void> saveRefreshToken(String token) => _storage.write(key: _refreshKey, value: token);

  @override
  Future<void> clear() => _storage.delete(key: _refreshKey);
}

/// For tests.
class MemoryTokenStore implements TokenStore {
  String? token;

  @override
  Future<String?> readRefreshToken() async => token;

  @override
  Future<void> saveRefreshToken(String value) async => token = value;

  @override
  Future<void> clear() async => token = null;
}

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());
