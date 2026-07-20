<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock, Message, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { authStore } from '../../stores/auth.js';
const router=useRouter(); const loading=ref(false); const accepted=ref(true); const form=reactive({displayName:'算法工程师',username:'engineer',password:'123456',confirmPassword:'123456',email:'engineer@fogtraffic.local'});
async function submit(){if(form.password!==form.confirmPassword){ElMessage.error('两次输入的密码不一致');return}if(!accepted.value){ElMessage.warning('请先同意平台使用规范');return}loading.value=true;try{await authStore.register(form);ElMessage.success('注册成功');router.replace('/app/chat')}catch(e){ElMessage.error(e.message)}finally{loading.value=false}}
</script>
<template>
  <div class="auth-tabs"><button @click="router.push('/login')">登录</button><button class="active">注册</button></div>
  <form class="auth-form" @submit.prevent="submit"><label><span>显示名称</span><div class="field-shell"><el-icon><User/></el-icon><input v-model="form.displayName" required></div></label><label><span>用户名</span><div class="field-shell"><el-icon><User/></el-icon><input v-model="form.username" required></div></label><label><span>密码</span><div class="field-shell"><el-icon><Lock/></el-icon><input v-model="form.password" type="password" minlength="6" required></div></label><label><span>确认密码</span><div class="field-shell"><el-icon><Lock/></el-icon><input v-model="form.confirmPassword" type="password" minlength="6" required></div></label><label><span>邮箱</span><div class="field-shell"><el-icon><Message/></el-icon><input v-model="form.email" type="email" required></div></label><label class="register-agreement"><input v-model="accepted" type="checkbox"><span></span>我同意平台使用规范和本地数据说明</label><button class="btn btn-primary btn-auth" :disabled="loading"><span v-if="loading" class="spinner"></span>{{loading?'正在创建…':'注册并登录'}}<el-icon v-if="!loading"><ArrowRight/></el-icon></button></form><p class="auth-terms">演示服务只在本地保存注册信息，不会上传到第三方服务。</p>
</template>
