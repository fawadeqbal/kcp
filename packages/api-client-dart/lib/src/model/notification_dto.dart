//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'notification_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class NotificationDto {
  /// Returns a new [NotificationDto] instance.
  NotificationDto({
    required this.id,

    required this.type,

    required this.data,

    required this.read,

    required this.createdAt,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// badge_earned, certificate_issued, payment_receipt, payment_failed, plan_ended, trial_ending, child_shipped or child_certificate.
  @JsonKey(name: r'type', required: true, includeIfNull: false)
  final String type;

  /// Keys and IDs the message needs, e.g. { \"badgeKey\": \"first-ship\" }.
  @JsonKey(name: r'data', required: true, includeIfNull: false)
  final Map<String, Object> data;

  @JsonKey(name: r'read', required: true, includeIfNull: false)
  final bool read;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationDto &&
          other.id == id &&
          other.type == type &&
          other.data == data &&
          other.read == read &&
          other.createdAt == createdAt;

  @override
  int get hashCode =>
      id.hashCode +
      type.hashCode +
      data.hashCode +
      read.hashCode +
      createdAt.hashCode;

  factory NotificationDto.fromJson(Map<String, dynamic> json) =>
      _$NotificationDtoFromJson(json);

  Map<String, dynamic> toJson() => _$NotificationDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
