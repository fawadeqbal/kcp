//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'subscription_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SubscriptionDto {
  /// Returns a new [SubscriptionDto] instance.
  SubscriptionDto({
    required this.id,

    required this.planKey,

    required this.provider,

    required this.status,

    required this.currency,

    required this.amountMinor,

    required this.children,

    required this.currentPeriodStart,

    required this.currentPeriodEnd,

    required this.cancelAtPeriodEnd,

    required this.canceledAt,

    required this.endedAt,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'planKey', required: true, includeIfNull: false)
  final String planKey;

  /// STRIPE = card; MANUAL = paid another way, recorded by our team.
  @JsonKey(
    name: r'provider',
    required: true,
    includeIfNull: false,
    unknownEnumValue: SubscriptionDtoProviderEnum.unknownDefaultOpenApi,
  )
  final SubscriptionDtoProviderEnum provider;

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: SubscriptionDtoStatusEnum.unknownDefaultOpenApi,
  )
  final SubscriptionDtoStatusEnum status;

  @JsonKey(name: r'currency', required: true, includeIfNull: false)
  final String currency;

  /// One period for the whole family.
  @JsonKey(name: r'amountMinor', required: true, includeIfNull: false)
  final num amountMinor;

  @JsonKey(name: r'children', required: true, includeIfNull: false)
  final num children;

  @JsonKey(name: r'currentPeriodStart', required: true, includeIfNull: false)
  final DateTime currentPeriodStart;

  @JsonKey(name: r'currentPeriodEnd', required: true, includeIfNull: false)
  final DateTime currentPeriodEnd;

  /// Cancelled: premium stays until the period ends and the plan doesn't renew.
  @JsonKey(name: r'cancelAtPeriodEnd', required: true, includeIfNull: false)
  final bool cancelAtPeriodEnd;

  @JsonKey(name: r'canceledAt', required: true, includeIfNull: true)
  final DateTime? canceledAt;

  @JsonKey(name: r'endedAt', required: true, includeIfNull: true)
  final DateTime? endedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubscriptionDto &&
          other.id == id &&
          other.planKey == planKey &&
          other.provider == provider &&
          other.status == status &&
          other.currency == currency &&
          other.amountMinor == amountMinor &&
          other.children == children &&
          other.currentPeriodStart == currentPeriodStart &&
          other.currentPeriodEnd == currentPeriodEnd &&
          other.cancelAtPeriodEnd == cancelAtPeriodEnd &&
          other.canceledAt == canceledAt &&
          other.endedAt == endedAt;

  @override
  int get hashCode =>
      id.hashCode +
      planKey.hashCode +
      provider.hashCode +
      status.hashCode +
      currency.hashCode +
      amountMinor.hashCode +
      children.hashCode +
      currentPeriodStart.hashCode +
      currentPeriodEnd.hashCode +
      cancelAtPeriodEnd.hashCode +
      (canceledAt == null ? 0 : canceledAt.hashCode) +
      (endedAt == null ? 0 : endedAt.hashCode);

  factory SubscriptionDto.fromJson(Map<String, dynamic> json) =>
      _$SubscriptionDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SubscriptionDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// STRIPE = card; MANUAL = paid another way, recorded by our team.
enum SubscriptionDtoProviderEnum {
  @JsonValue(r'MANUAL')
  MANUAL(r'MANUAL'),
  @JsonValue(r'STRIPE')
  STRIPE(r'STRIPE'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const SubscriptionDtoProviderEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum SubscriptionDtoStatusEnum {
  @JsonValue(r'ACTIVE')
  ACTIVE(r'ACTIVE'),
  @JsonValue(r'PAST_DUE')
  PAST_DUE(r'PAST_DUE'),
  @JsonValue(r'CANCELED')
  CANCELED(r'CANCELED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const SubscriptionDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
