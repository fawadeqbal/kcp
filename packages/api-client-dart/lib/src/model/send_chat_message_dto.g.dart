// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'send_chat_message_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SendChatMessageDtoCWProxy {
  SendChatMessageDto phrase(SendChatMessageDtoPhraseEnum? phrase);

  SendChatMessageDto text(String? text);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SendChatMessageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SendChatMessageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SendChatMessageDto call({SendChatMessageDtoPhraseEnum? phrase, String? text});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSendChatMessageDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSendChatMessageDto.copyWith.fieldName(...)`
class _$SendChatMessageDtoCWProxyImpl implements _$SendChatMessageDtoCWProxy {
  const _$SendChatMessageDtoCWProxyImpl(this._value);

  final SendChatMessageDto _value;

  @override
  SendChatMessageDto phrase(SendChatMessageDtoPhraseEnum? phrase) =>
      this(phrase: phrase);

  @override
  SendChatMessageDto text(String? text) => this(text: text);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SendChatMessageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SendChatMessageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SendChatMessageDto call({
    Object? phrase = const $CopyWithPlaceholder(),
    Object? text = const $CopyWithPlaceholder(),
  }) {
    return SendChatMessageDto(
      phrase: phrase == const $CopyWithPlaceholder()
          ? _value.phrase
          // ignore: cast_nullable_to_non_nullable
          : phrase as SendChatMessageDtoPhraseEnum?,
      text: text == const $CopyWithPlaceholder()
          ? _value.text
          // ignore: cast_nullable_to_non_nullable
          : text as String?,
    );
  }
}

extension $SendChatMessageDtoCopyWith on SendChatMessageDto {
  /// Returns a callable class that can be used as follows: `instanceOfSendChatMessageDto.copyWith(...)` or like so:`instanceOfSendChatMessageDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SendChatMessageDtoCWProxy get copyWith =>
      _$SendChatMessageDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SendChatMessageDto _$SendChatMessageDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SendChatMessageDto', json, ($checkedConvert) {
      final val = SendChatMessageDto(
        phrase: $checkedConvert(
          'phrase',
          (v) => $enumDecodeNullable(
            _$SendChatMessageDtoPhraseEnumEnumMap,
            v,
            unknownValue: SendChatMessageDtoPhraseEnum.unknownDefaultOpenApi,
          ),
        ),
        text: $checkedConvert('text', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$SendChatMessageDtoToJson(SendChatMessageDto instance) =>
    <String, dynamic>{
      'phrase': ?_$SendChatMessageDtoPhraseEnumEnumMap[instance.phrase],
      'text': ?instance.text,
    };

const _$SendChatMessageDtoPhraseEnumEnumMap = {
  SendChatMessageDtoPhraseEnum.hello: 'hello',
  SendChatMessageDtoPhraseEnum.thanks: 'thanks',
  SendChatMessageDtoPhraseEnum.greatJob: 'great-job',
  SendChatMessageDtoPhraseEnum.letsGo: 'lets-go',
  SendChatMessageDtoPhraseEnum.iNeedHelp: 'i-need-help',
  SendChatMessageDtoPhraseEnum.canYouCheck: 'can-you-check',
  SendChatMessageDtoPhraseEnum.iHaveAnIdea: 'i-have-an-idea',
  SendChatMessageDtoPhraseEnum.myPartIsDone: 'my-part-is-done',
  SendChatMessageDtoPhraseEnum.goodIdea: 'good-idea',
  SendChatMessageDtoPhraseEnum.giveMeAMinute: 'give-me-a-minute',
  SendChatMessageDtoPhraseEnum.yes: 'yes',
  SendChatMessageDtoPhraseEnum.no: 'no',
  SendChatMessageDtoPhraseEnum.seeYou: 'see-you',
  SendChatMessageDtoPhraseEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
