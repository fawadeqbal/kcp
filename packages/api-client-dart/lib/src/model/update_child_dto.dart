//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'update_child_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class UpdateChildDto {
  /// Returns a new [UpdateChildDto] instance.
  UpdateChildDto({
    this.nickname,

    this.avatarKey,

    this.languageCode,

    this.regionId,

    this.cityId,

    this.streakReminders,
  });

  @JsonKey(name: r'nickname', required: false, includeIfNull: false)
  final String? nickname;

  @JsonKey(
    name: r'avatarKey',
    required: false,
    includeIfNull: false,
    unknownEnumValue: UpdateChildDtoAvatarKeyEnum.unknownDefaultOpenApi,
  )
  final UpdateChildDtoAvatarKeyEnum? avatarKey;

  @JsonKey(name: r'languageCode', required: false, includeIfNull: false)
  final String? languageCode;

  @JsonKey(name: r'regionId', required: false, includeIfNull: false)
  final String? regionId;

  @JsonKey(name: r'cityId', required: false, includeIfNull: false)
  final String? cityId;

  /// Evening reminders on the child's phone when their streak is about to end.
  @JsonKey(name: r'streakReminders', required: false, includeIfNull: false)
  final bool? streakReminders;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateChildDto &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.languageCode == languageCode &&
          other.regionId == regionId &&
          other.cityId == cityId &&
          other.streakReminders == streakReminders;

  @override
  int get hashCode =>
      nickname.hashCode +
      avatarKey.hashCode +
      languageCode.hashCode +
      regionId.hashCode +
      cityId.hashCode +
      streakReminders.hashCode;

  factory UpdateChildDto.fromJson(Map<String, dynamic> json) =>
      _$UpdateChildDtoFromJson(json);

  Map<String, dynamic> toJson() => _$UpdateChildDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum UpdateChildDtoAvatarKeyEnum {
  @JsonValue(r'rocket')
  rocket(r'rocket'),
  @JsonValue(r'star')
  star(r'star'),
  @JsonValue(r'bolt')
  bolt(r'bolt'),
  @JsonValue(r'planet')
  planet(r'planet'),
  @JsonValue(r'robot')
  robot(r'robot'),
  @JsonValue(r'leaf')
  leaf(r'leaf'),
  @JsonValue(r'moon')
  moon(r'moon'),
  @JsonValue(r'sun')
  sun(r'sun'),
  @JsonValue(r'cube')
  cube(r'cube'),
  @JsonValue(r'gamepad')
  gamepad(r'gamepad'),
  @JsonValue(r'music')
  music(r'music'),
  @JsonValue(r'code')
  code(r'code'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const UpdateChildDtoAvatarKeyEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
