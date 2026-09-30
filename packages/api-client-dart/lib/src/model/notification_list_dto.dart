//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/notification_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'notification_list_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class NotificationListDto {
  /// Returns a new [NotificationListDto] instance.
  NotificationListDto({required this.unread, required this.items});

  @JsonKey(name: r'unread', required: true, includeIfNull: false)
  final num unread;

  @JsonKey(name: r'items', required: true, includeIfNull: false)
  final List<NotificationDto> items;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationListDto &&
          other.unread == unread &&
          other.items == items;

  @override
  int get hashCode => unread.hashCode + items.hashCode;

  factory NotificationListDto.fromJson(Map<String, dynamic> json) =>
      _$NotificationListDtoFromJson(json);

  Map<String, dynamic> toJson() => _$NotificationListDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
