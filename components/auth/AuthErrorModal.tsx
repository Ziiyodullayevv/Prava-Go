import React from "react";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Icon, CloseIcon } from "@/components/ui/icon";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";

type AuthErrorModalProps = {
	isOpen: boolean;
	title: string;
	message: string;
	onClose: () => void;
};

export function AuthErrorModal({
	isOpen,
	title,
	message,
	onClose,
}: AuthErrorModalProps) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} size="md">
			<ModalBackdrop className="bg-foreground/20 !backdrop-blur-2xl" />
			<ModalContent className="rounded-3xl bg-background p-5">
				<ModalHeader className="relative">
					<Heading size="md">{title}</Heading>
					<ModalCloseButton
						className="bg-foreground/10 w-7 h-7 rounded-full justify-center absolute right-0 top-0 items-center"
						onPress={onClose}
					>
						<Icon as={CloseIcon} size="sm" />
					</ModalCloseButton>
				</ModalHeader>
				<ModalBody className="pt-2">
					<Text className="text-base text-foreground/80">{message}</Text>
				</ModalBody>
				<ModalFooter className="pt-3">
					<Button className="w-full rounded-full" onPress={onClose}>
						<ButtonText>Tushundim</ButtonText>
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
