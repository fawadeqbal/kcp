//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/me_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'login_response_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LoginResponseDto {
  /// Returns a new [LoginResponseDto] instance.
  LoginResponseDto({
    required this.status,

    this.accessToken,

    this.expiresIn,

    this.refreshToken,

    this.mfaToken,

    this.user,
  });

  /// authenticated = signed in. mfa_required = send the authenticator code to /v1/auth/mfa/verify. mfa_setup_required = staff account without two-factor yet: call /v1/auth/mfa/setup, then /v1/auth/mfa/verify.
  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LoginResponseDtoStatusEnum.unknownDefaultOpenApi,
  )
  final LoginResponseDtoStatusEnum status;

  /// Send as \"Authorization: Bearer …\".
  @JsonKey(name: r'accessToken', required: false, includeIfNull: false)
  final String? accessToken;

  /// Seconds until the access token expires.
  @JsonKey(name: r'expiresIn', required: false, includeIfNull: false)
  final num? expiresIn;

  /// Only when tokenDelivery is \"body\".
  @JsonKey(name: r'refreshToken', required: false, includeIfNull: false)
  final String? refreshToken;

  /// Short-lived token for the two-factor step.
  @JsonKey(name: r'mfaToken', required: false, includeIfNull: false)
  final String? mfaToken;

  @JsonKey(name: r'user', required: false, includeIfNull: false)
  final MeDto? user;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoginResponseDto &&
          other.status == status &&
          other.accessToken == accessToken &&
          other.expiresIn == expiresIn &&
          other.refreshToken == refreshToken &&
          other.mfaToken == mfaToken &&
          other.user == user;

  @override
  int get hashCode =>
      status.hashCode +
      accessToken.hashCode +
      expiresIn.hashCode +
      refreshToken.hashCode +
      mfaToken.hashCode +
      user.hashCode;

  factory LoginResponseDto.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LoginResponseDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// authenticated = signed in. mfa_required = send the authenticator code to /v1/auth/mfa/verify. mfa_setup_required = staff account without two-factor yet: call /v1/auth/mfa/setup, then /v1/auth/mfa/verify.
enum LoginResponseDtoStatusEnum {
  @JsonValue(r'authenticated')
  authenticated(r'authenticated'),
  @JsonValue(r'mfa_required')
  mfaRequired(r'mfa_required'),
  @JsonValue(r'mfa_setup_required')
  mfaSetupRequired(r'mfa_setup_required'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LoginResponseDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
